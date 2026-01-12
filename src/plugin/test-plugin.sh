#!/bin/bash

# SpecFlux Plugin Test Script
# Run this to verify the plugin structure is correct

PLUGIN_DIR="$(dirname "$0")"
cd "$PLUGIN_DIR"

echo "=========================================="
echo "  SpecFlux Plugin Verification"
echo "=========================================="
echo ""

PASS=0
FAIL=0

check_pass() {
    echo "  ✓ $1"
    PASS=$((PASS + 1))
}

check_fail() {
    echo "  ✗ $1"
    FAIL=$((FAIL + 1))
}

echo "1. Checking plugin structure..."
echo ""

# Check plugin.json exists and is valid JSON
if [ -f ".claude-plugin/plugin.json" ]; then
    check_pass "plugin.json exists"

    # Validate JSON and extract fields
    NAME=$(python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json')).get('name', ''))" 2>/dev/null)
    VERSION=$(python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json')).get('version', ''))" 2>/dev/null)

    if [ -n "$NAME" ]; then
        check_pass "plugin name: $NAME"
    else
        check_fail "plugin.json missing 'name' field"
    fi

    if [ -n "$VERSION" ]; then
        check_pass "plugin version: $VERSION"
    else
        check_fail "plugin.json missing 'version' field"
    fi
else
    check_fail "plugin.json exists"
fi

echo ""
echo "2. Checking commands..."
echo ""

# Check commands
for cmd in planning implement; do
    if [ -f "commands/${cmd}.md" ]; then
        check_pass "commands/${cmd}.md"
    else
        check_fail "commands/${cmd}.md missing"
    fi
done

echo ""
echo "3. Checking skills..."
echo ""

# Check skills
for skill in specflux-coding specflux-api prd-template epic-template; do
    if [ -f "skills/${skill}/SKILL.md" ]; then
        check_pass "skills/${skill}/SKILL.md"
    else
        check_fail "skills/${skill}/SKILL.md missing"
    fi
done

# Check specflux-api references
if [ -f "skills/specflux-api/references/api.md" ]; then
    check_pass "skills/specflux-api/references/api.md"
else
    check_fail "skills/specflux-api/references/api.md missing"
fi

echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
    echo ""
    echo "Plugin has issues that need to be fixed."
    exit 1
else
    echo ""
    echo "Plugin structure is valid!"
    echo ""
    echo "=========================================="
    echo "  How to Test"
    echo "=========================================="
    echo ""
    echo "1. Start Claude Code with the plugin:"
    echo ""
    echo "   claude --plugin-dir $(pwd)"
    echo ""
    echo "2. Test the planning command:"
    echo ""
    echo "   /specflux:planning"
    echo ""
    echo "3. Test the implement command:"
    echo ""
    echo "   /specflux:implement"
    echo ""
    echo "4. Verify skills are loaded:"
    echo ""
    echo "   Ask: 'List the available specflux skills'"
    echo ""
    exit 0
fi
