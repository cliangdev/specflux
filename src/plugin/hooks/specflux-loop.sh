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

    # Step 6: Query API for next task and decide
    # This will be implemented in subsequent tasks (328, 329, 330)
    # For now, output a placeholder that will be replaced

    local system_msg="SpecFlux loop iteration ${next_iteration}/${max_iterations} | Tag: ${tag} | To cancel: /specflux:cancel-loop --tag ${tag}"

    # Placeholder - will be replaced by API query logic in task 328
    output_block "Continue implementing tasks for tag: ${tag}" "$system_msg"
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
