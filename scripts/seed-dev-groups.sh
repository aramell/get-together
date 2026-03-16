#!/bin/bash

# Development seeding script to add test groups
# This creates test groups and memberships for development/testing

# Get the logged-in user ID (you'll need to replace this with your actual Cognito user ID)
# For now, we'll query the database to see if there are any existing memberships
# and add groups for any user

echo "Seeding development groups..."

psql -h localhost -U postgres -d gettogether << 'EOF'
-- Get a sample of user IDs that have been added to groups
SELECT DISTINCT gm.user_id FROM group_memberships gm LIMIT 1;
EOF

echo ""
echo "To seed groups for your user, run:"
echo "psql -h localhost -U postgres -d gettogether << 'EOF'"
echo "INSERT INTO groups (id, name, description, created_by, invite_code) VALUES"
echo "  (gen_random_uuid(), 'Your Group Name', 'Group description', 'YOUR_USER_ID_HERE', 'invite-code-here');"
echo "EOF"
echo ""
echo "Alternatively, create groups from the web UI after logging in."
