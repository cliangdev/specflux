#!/bin/bash
#
# SpecFlux Implementation Loop - Stop Hook
#
# This hook intercepts Claude's exit attempts and decides whether to
# continue the implementation loop or allow exit.
#
# Exit codes:
#   0 - Allow exit (output JSON with decision: "allow")
#   0 - Block exit (output JSON with decision: "block" and reason)
#

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

STATE_DIR=".specflux/tmp"
STATE_PATTERN="loop-*.local.md"

# =============================================================================
# Helper Functions
# =============================================================================

# Output JSON and exit
output_allow() {
    echo '{"decision": "allow"}'
    exit 0
}

output_block() {
    local reason="$1"
    local system_msg="${2:-}"

    if [[ -n "$system_msg" ]]; then
        jq -n \
            --arg reason "$reason" \
            --arg msg "$system_msg" \
            '{decision: "block", reason: $reason, systemMessage: $msg}'
    else
        jq -n \
            --arg reason "$reason" \
            '{decision: "block", reason: $reason}'
    fi
    exit 0
}

# Parse YAML frontmatter from state file
# Usage: parse_frontmatter "field" < state_file
parse_frontmatter() {
    local field="$1"
    # Extract value from YAML frontmatter (between --- markers)
    sed -n '/^---$/,/^---$/p' | grep "^${field}:" | sed "s/^${field}: *//" | tr -d '"'
}

# Update a field in the YAML frontmatter
update_frontmatter_field() {
    local file="$1"
    local field="$2"
    local value="$3"
    local temp_file="${file}.tmp.$$"

    # Use sed to update the field in place
    sed "s/^${field}: .*/${field}: ${value}/" "$file" > "$temp_file"
    mv "$temp_file" "$file"
}

# =============================================================================
# API Functions
# =============================================================================

# Query API for next implementable task
# Returns JSON with task details or empty if no tasks
query_next_task() {
    local tag="$1"
    local project_ref="${SPECFLUX_PROJECT_REF:-}"

    # Validate environment variables
    if [[ -z "${SPECFLUX_API_URL:-}" ]] || [[ -z "${SPECFLUX_API_KEY:-}" ]]; then
        echo "" # Return empty to signal error
        return 1
    fi

    # Build API URL with query params
    local api_url="${SPECFLUX_API_URL}/api/projects/${project_ref}/tasks"
    api_url="${api_url}?prdTag=${tag}&statusNot=COMPLETED,CANCELLED"

    # Query API
    local response
    response=$(curl -s -H "Authorization: Bearer ${SPECFLUX_API_KEY}" "$api_url" 2>/dev/null || echo "")

    if [[ -z "$response" ]]; then
        echo ""
        return 1
    fi

    # Extract first task from response
    local task_count
    task_count=$(echo "$response" | jq -r '.data | length' 2>/dev/null || echo "0")

    if [[ "$task_count" == "0" ]] || [[ "$task_count" == "null" ]]; then
        echo ""
        return 0
    fi

    # Return first task
    echo "$response" | jq -c '.data[0]' 2>/dev/null || echo ""
}

# Extract fields from task JSON
extract_task_field() {
    local task_json="$1"
    local field="$2"
    echo "$task_json" | jq -r ".$field // empty" 2>/dev/null || echo ""
}

# =============================================================================
# Main Logic
# =============================================================================

main() {
    # Step 1: Check for state files
    if [[ ! -d "$STATE_DIR" ]]; then
        output_allow
    fi

    # Find any active loop state files
    local state_files
    state_files=$(find "$STATE_DIR" -maxdepth 1 -name "$STATE_PATTERN" 2>/dev/null || true)

    if [[ -z "$state_files" ]]; then
        # No active loop - allow exit
        output_allow
    fi

    # Get first state file (we only support one active loop at a time)
    local state_file
    state_file=$(echo "$state_files" | head -n 1)

    if [[ ! -f "$state_file" ]]; then
        output_allow
    fi

    # Step 2: Parse state file
    local tag iteration max_iterations current_prd_ref started_at
    tag=$(parse_frontmatter "tag" < "$state_file")
    iteration=$(parse_frontmatter "iteration" < "$state_file")
    max_iterations=$(parse_frontmatter "max_iterations" < "$state_file")
    current_prd_ref=$(parse_frontmatter "current_prd_ref" < "$state_file")
    started_at=$(parse_frontmatter "started_at" < "$state_file")

    # Validate required fields
    if [[ -z "$tag" ]] || [[ -z "$iteration" ]] || [[ -z "$max_iterations" ]]; then
        # Invalid state file - delete and allow exit
        rm -f "$state_file"
        output_allow
    fi

    # Step 3: Increment iteration
    local next_iteration=$((iteration + 1))

    # Step 4: Check max iterations
    if [[ "$next_iteration" -gt "$max_iterations" ]]; then
        # Max iterations exceeded - delete state file and allow exit
        rm -f "$state_file"

        # Generate completion report (to stderr so it doesn't affect JSON output)
        generate_completion_report "$tag" "$iteration" "$started_at" >&2

        output_allow
    fi

    # Step 5: Update state file atomically
    update_frontmatter_field "$state_file" "iteration" "$next_iteration"

    # Step 6: Query API for next task
    local task_json
    task_json=$(query_next_task "$tag")

    if [[ -z "$task_json" ]]; then
        # No more tasks - loop complete
        rm -f "$state_file"
        generate_completion_report "$tag" "$iteration" "$started_at" >&2
        output_allow
    fi

    # Extract task details
    local task_ref task_title task_description task_prd_ref
    task_ref=$(extract_task_field "$task_json" "displayKey")
    task_title=$(extract_task_field "$task_json" "title")
    task_description=$(extract_task_field "$task_json" "description")

    # Get PRD ref from epic (for context switching - will be enhanced in task 329)
    local epic_display_key
    epic_display_key=$(extract_task_field "$task_json" "epicDisplayKey")

    # Step 7: Generate implementation prompt
    local system_msg="SpecFlux loop iteration ${next_iteration}/${max_iterations} | Tag: ${tag} | To cancel: /specflux:cancel-loop --tag ${tag}"

    local prompt
    prompt=$(generate_task_prompt "$task_ref" "$task_title" "$task_description")

    output_block "$prompt" "$system_msg"
}

# =============================================================================
# Prompt Generation
# =============================================================================

generate_task_prompt() {
    local task_ref="$1"
    local task_title="$2"
    local task_description="$3"

    cat <<EOF
## Your Task
Implement task ${task_ref}: ${task_title}

## Task Details
${task_description}

## Rules
- Follow specflux-coding skill (tests first, one commit per task)
- Mark each criterion complete via API when done
- Update task status to COMPLETED when all criteria pass
- If blocked, mark task BLOCKED with reason, then exit to continue to next task
- Do NOT ask questions - if unclear, mark BLOCKED and move on
EOF
}

# =============================================================================
# Completion Report (placeholder - will be enhanced in task 330)
# =============================================================================

generate_completion_report() {
    local tag="$1"
    local iterations="$2"
    local started_at="$3"

    echo ""
    echo "========================================"
    echo "SpecFlux Implementation Loop Complete"
    echo "========================================"
    echo "Tag: $tag"
    echo "Iterations: $iterations"
    echo ""
    echo "Max iterations reached."
    echo "To continue: /specflux:implement-loop --tag $tag"
    echo ""
}

# Run main function
main "$@"
