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
    local task_ref task_title task_description
    task_ref=$(extract_task_field "$task_json" "displayKey")
    task_title=$(extract_task_field "$task_json" "title")
    task_description=$(extract_task_field "$task_json" "description")

    # Get epic ref to determine PRD (use epic as proxy for PRD context)
    local epic_display_key
    epic_display_key=$(extract_task_field "$task_json" "epicDisplayKey")

    # Step 7: Check for PRD/Epic context switch
    local is_context_switch=false
    if [[ -n "$current_prd_ref" ]] && [[ "$current_prd_ref" != "null" ]] && [[ "$current_prd_ref" != "$epic_display_key" ]]; then
        is_context_switch=true
    fi

    # Update current_prd_ref in state file (using epic ref as context identifier)
    if [[ -n "$epic_display_key" ]] && [[ "$epic_display_key" != "null" ]]; then
        update_frontmatter_field "$state_file" "current_prd_ref" "\"$epic_display_key\""
    fi

    # Step 8: Generate implementation prompt based on context
    local system_msg="SpecFlux loop iteration ${next_iteration}/${max_iterations} | Tag: ${tag} | To cancel: /specflux:cancel-loop --tag ${tag}"

    local prompt
    if [[ "$is_context_switch" == "true" ]]; then
        prompt=$(generate_fresh_context_prompt "$task_ref" "$task_title" "$task_description" "$epic_display_key")
    else
        prompt=$(generate_continue_prompt "$task_ref" "$task_title" "$task_description")
    fi

    output_block "$prompt" "$system_msg"
}

# =============================================================================
# Prompt Generation
# =============================================================================

# Continue prompt - used when staying within same PRD/epic context
generate_continue_prompt() {
    local task_ref="$1"
    local task_title="$2"
    local task_description="$3"

    cat <<EOF
## Next Task
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

# Fresh context prompt - used when switching to a different PRD/epic
generate_fresh_context_prompt() {
    local task_ref="$1"
    local task_title="$2"
    local task_description="$3"
    local epic_ref="$4"

    cat <<EOF
START FRESH - New epic context.

## Switching to Epic: ${epic_ref}
Ignore previous epic context. Get fresh context from:
- API: Task details and acceptance criteria below
- Git: \`git log --oneline -20\` shows recent commits
- Files: Read relevant source files as needed

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
# Completion Report
# =============================================================================

generate_completion_report() {
    local tag="$1"
    local iterations="$2"
    local started_at="$3"

    # Calculate duration
    local duration
    duration=$(calculate_duration "$started_at")

    # Query API for task stats
    local completed_count blocked_count remaining_count
    local blocked_tasks

    # Get completed tasks
    completed_count=$(query_task_count "$tag" "COMPLETED")

    # Get blocked tasks
    blocked_count=$(query_task_count "$tag" "BLOCKED")
    blocked_tasks=$(query_blocked_tasks "$tag")

    # Get remaining (not completed, not cancelled, not blocked)
    remaining_count=$(query_remaining_count "$tag")

    echo ""
    echo "========================================"
    echo "SpecFlux Implementation Loop Complete"
    echo "========================================"
    echo "Tag: $tag"
    echo "Iterations: $iterations"
    echo "Duration: $duration"
    echo ""
    echo "Results:"
    echo "  Completed:  $completed_count tasks"
    echo "  Blocked:    $blocked_count tasks"
    echo "  Remaining:  $remaining_count tasks (not attempted)"
    echo ""

    if [[ -n "$blocked_tasks" ]] && [[ "$blocked_tasks" != "null" ]]; then
        echo "Blocked Tasks:"
        echo "$blocked_tasks"
        echo ""
    fi

    echo "To continue: /specflux:implement-loop --tag $tag"
    echo ""
}

# Calculate human-readable duration from ISO timestamp to now
calculate_duration() {
    local started_at="$1"

    # Parse started_at and calculate difference in seconds
    local start_epoch now_epoch diff_seconds
    start_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${started_at%%.*}" "+%s" 2>/dev/null || echo "0")
    now_epoch=$(date "+%s")

    if [[ "$start_epoch" == "0" ]]; then
        echo "unknown"
        return
    fi

    diff_seconds=$((now_epoch - start_epoch))

    # Convert to human-readable
    local hours minutes
    hours=$((diff_seconds / 3600))
    minutes=$(((diff_seconds % 3600) / 60))

    if [[ "$hours" -gt 0 ]]; then
        echo "${hours}h ${minutes}m"
    else
        echo "${minutes}m"
    fi
}

# Query task count by status
query_task_count() {
    local tag="$1"
    local status="$2"
    local project_ref="${SPECFLUX_PROJECT_REF:-}"

    if [[ -z "${SPECFLUX_API_URL:-}" ]] || [[ -z "${SPECFLUX_API_KEY:-}" ]]; then
        echo "0"
        return
    fi

    local api_url="${SPECFLUX_API_URL}/api/projects/${project_ref}/tasks"
    api_url="${api_url}?prdTag=${tag}&status=${status}"

    local response
    response=$(curl -s -H "Authorization: Bearer ${SPECFLUX_API_KEY}" "$api_url" 2>/dev/null || echo "")

    if [[ -z "$response" ]]; then
        echo "0"
        return
    fi

    echo "$response" | jq -r '.pagination.total // 0' 2>/dev/null || echo "0"
}

# Query remaining tasks (not completed, cancelled, or blocked)
query_remaining_count() {
    local tag="$1"
    local project_ref="${SPECFLUX_PROJECT_REF:-}"

    if [[ -z "${SPECFLUX_API_URL:-}" ]] || [[ -z "${SPECFLUX_API_KEY:-}" ]]; then
        echo "0"
        return
    fi

    local api_url="${SPECFLUX_API_URL}/api/projects/${project_ref}/tasks"
    api_url="${api_url}?prdTag=${tag}&statusNot=COMPLETED,CANCELLED,BLOCKED"

    local response
    response=$(curl -s -H "Authorization: Bearer ${SPECFLUX_API_KEY}" "$api_url" 2>/dev/null || echo "")

    if [[ -z "$response" ]]; then
        echo "0"
        return
    fi

    echo "$response" | jq -r '.pagination.total // 0' 2>/dev/null || echo "0"
}

# Query blocked tasks with reasons
query_blocked_tasks() {
    local tag="$1"
    local project_ref="${SPECFLUX_PROJECT_REF:-}"

    if [[ -z "${SPECFLUX_API_URL:-}" ]] || [[ -z "${SPECFLUX_API_KEY:-}" ]]; then
        echo ""
        return
    fi

    local api_url="${SPECFLUX_API_URL}/api/projects/${project_ref}/tasks"
    api_url="${api_url}?prdTag=${tag}&status=BLOCKED"

    local response
    response=$(curl -s -H "Authorization: Bearer ${SPECFLUX_API_KEY}" "$api_url" 2>/dev/null || echo "")

    if [[ -z "$response" ]]; then
        echo ""
        return
    fi

    # Extract blocked tasks and format as list
    echo "$response" | jq -r '.data[] | "  - \(.displayKey): \(.title)"' 2>/dev/null || echo ""
}

# Run main function
main "$@"
