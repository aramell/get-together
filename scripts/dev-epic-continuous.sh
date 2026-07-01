#!/bin/bash
# Continuously pick and work on pending stories in the current epic
# Usage: ./scripts/dev-epic-continuous.sh [epic-name]

EPIC_NAME="${1:-Epic 7}"  # Default to current epic
PLANNING_DIR="_bmad-output/planning-artifacts"
STORY_PATTERN="$(echo "$EPIC_NAME" | tr ' ' '_')_*.md"

echo "🔄 Picking next pending story from: $EPIC_NAME"

# Find the first pending story file
NEXT_STORY=$(find "$PLANNING_DIR" -name "$STORY_PATTERN" -type f 2>/dev/null | sort | head -1)

if [ -z "$NEXT_STORY" ]; then
  echo "❌ No story files found for $EPIC_NAME"
  exit 1
fi

# Check if story is already complete (look for completion marker in file)
if grep -q "Status:.*complete\|Status:.*done" "$NEXT_STORY" 2>/dev/null; then
  echo "✅ Story already complete: $NEXT_STORY"
  exit 0
fi

# Extract story title from filename or file content
STORY_TITLE=$(head -1 "$NEXT_STORY" | sed 's/^# //')
echo "📖 Working on: $STORY_TITLE"
echo "📄 File: $NEXT_STORY"
echo ""

# Run the story development (this will pause the loop while working)
# The claude dev-story command handles the actual implementation
echo "Launching story development workflow..."
echo "Story file: $NEXT_STORY"
