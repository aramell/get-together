#!/bin/bash
# Find the next pending story in the epic
# Returns the file path of the next story to work on

PLANNING_DIR="_bmad-output/planning-artifacts"
IMPL_DIR="_bmad-output/implementation-artifacts"

# Look for story files that are NOT marked as completed
# Searches for files like: "story_7_2_*.md" that don't have "completed" in their path or content
NEXT_STORY=$(find "$PLANNING_DIR" -name "story_*.md" -type f 2>/dev/null | while read story; do
  # Skip if story file contains completion marker
  if ! grep -qi "status.*complete\|completed\|✅.*complete" "$story" 2>/dev/null; then
    echo "$story"
    exit 0
  fi
done | head -1)

if [ -n "$NEXT_STORY" ]; then
  echo "$NEXT_STORY"
  exit 0
else
  echo "" >&2
  echo "⚠️  No pending stories found. Epic may be complete!" >&2
  exit 1
fi
