# Story 2-2: View Groups List

**Epic:** 2 - Group Management
**Status:** Ready for Development
**Priority:** High
**Complexity:** Medium

## Narrative

As a user, I want to see a list of all groups I'm a member of, so that I can quickly access the groups I participate in.

## Acceptance Criteria

1. **Groups Dashboard Page**
   - Page at `/groups` displays all groups user is a member of
   - Requires authentication (redirect to login if not authenticated)
   - Shows groups sorted by last activity (most recent first)
   - Displays empty state message if user has no groups

2. **Group List Display**
   - Each group shows:
     - Group name (clickable, navigates to group details)
     - Description (truncated if too long)
     - Member count
     - User's role (Admin or Member badge)
     - Last activity date
     - Quick action buttons (View, Leave)
   - Groups displayed as cards in a responsive grid

3. **Sorting and Filtering**
   - Default: Sort by last_activity_date (DESC)
   - Filter option: Show all / Show only admin groups
   - Search field: Filter groups by name (client-side)

4. **Pagination**
   - Display 12 groups per page
   - Previous/Next buttons
   - Page selector dropdown
   - Show total count and current page

5. **Actions**
   - View button: Navigate to group details
   - Leave button: Remove self from group (with confirmation)
   - Create Group button: Navigate to create group page

6. **Empty States**
   - No groups: "You haven't joined any groups yet"
   - Search results: "No groups match your search"
   - Show "Create Group" button or "Join via Invite" link

7. **Responsive Design**
   - Mobile: 1 column layout
   - Tablet: 2 column layout
   - Desktop: 3 column layout
   - Buttons stack on mobile

8. **Loading and Error States**
   - Loading spinner while fetching groups
   - Error message if fetch fails
   - Retry button on error

## Technical Requirements

### API Endpoint
- `GET /api/groups?user_id={userId}` - Get all groups for user
  - Required: Authentication (JWT token)
  - Response: `{ success, message, groups: [] }`
  - Status: 200 (success), 400 (missing user_id), 401 (auth), 500 (error)
  - Returns: id, name, description, member_count, role, last_activity_date

### Database Query
- `getGroupsByUserId(userId)` - Already implemented in queries.ts
- Returns groups with member count and user's role
- Sorted by updated_at DESC (last activity)

### Routes
- `/groups` - Groups list page
  - GET: Display user's groups with optional filters

### Components
- `GroupsPage` - Page component at `app/groups/page.tsx`
- `GroupsGrid` - Grid layout component at `components/groups/GroupsGrid.tsx`
- `GroupCard` - Individual group card at `components/groups/GroupCard.tsx`
- `GroupsEmptyState` - Empty state component at `components/groups/GroupsEmptyState.tsx`

### Service Layer
- `getGroupsByUser(userId)` - Already exists in groupService.ts
- Returns structured response with groups array

## Implementation Tasks

### Task 1.1: Set Up Groups List API
- GET handler already exists in /api/groups
- Verify it returns correct format with member_count, role, last_activity_date
- Add pagination support (offset/limit query params)

### Task 1.2: Create Groups Page Component
- Create `app/groups/page.tsx`
- Fetch groups using getGroupsByUser service
- Handle loading and error states
- Layout with header and create button

### Task 1.3: Create GroupCard Component
- Create `components/groups/GroupCard.tsx`
- Display group info: name, description, member count
- Show user's role badge
- Display last activity date
- Action buttons: View, Leave

### Task 1.4: Create GroupsGrid Component
- Create `components/groups/GroupsGrid.tsx`
- Responsive grid layout (1/2/3 columns)
- Card components arranged in grid
- Pagination controls
- Search/filter integration

### Task 1.5: Create Empty State Component
- Create `components/groups/GroupsEmptyState.tsx`
- Show when user has no groups
- Show when search has no results
- Links to create/join groups

### Task 1.6: Add Search and Filter
- Client-side search by group name
- Filter toggle: all groups / admin only
- Real-time filtering as user types
- Clear search button

### Task 1.7: Implement Leave Group
- Leave button in GroupCard
- Confirmation modal before leaving
- Update groups list after leave
- Toast notification

### Task 1.8: Write Comprehensive Tests
- Page component tests
- GroupCard component tests
- GroupsGrid component tests
- API endpoint tests
- Search/filter tests
- Leave group tests

## Acceptance Criteria Mapping

| Criteria | Implementation | Component |
|----------|-----------------|-----------|
| Dashboard page | /groups route | GroupsPage |
| Group list display | Cards with metadata | GroupCard |
| Sorting | Query: ORDER BY updated_at DESC | API |
| Pagination | Previous/Next buttons | GroupsGrid |
| Actions | View/Leave buttons | GroupCard |
| Empty states | Empty state component | GroupsEmptyState |
| Responsive | Chakra Grid responsive | GroupsGrid |
| Loading/Error | Loading spinner, Alert | GroupsPage |

## Database Schema (Existing)

```sql
-- Query returns:
SELECT
  g.id,
  g.name,
  g.description,
  g.created_by,
  COUNT(gm.id) as member_count,
  gm.role as user_role,
  g.created_at,
  g.updated_at
FROM groups g
INNER JOIN group_memberships gm ON g.id = gm.group_id
WHERE gm.user_id = $1
GROUP BY g.id, gm.role
ORDER BY g.updated_at DESC
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Groups retrieved successfully",
  "groups": [
    {
      "id": "uuid",
      "name": "Group Name",
      "description": "Group description",
      "created_by": "uuid",
      "member_count": 5,
      "user_role": "admin",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errorCode": "ERROR_CODE"
}
```

## UI Components Structure

```
GroupsPage
├── Header (Title + Create Button)
├── Search/Filter Bar
├── Loading Spinner (conditional)
├── Error Alert (conditional)
├── GroupsGrid
│   ├── GroupCard (repeated)
│   │   ├── Group Name (clickable)
│   │   ├── Description
│   │   ├── Stats (Members, Role, Last Activity)
│   │   └── Actions (View, Leave)
│   └── Pagination Controls
└── GroupsEmptyState (conditional)
```

## Styling Details

**GroupCard:**
- Chakra Card component with hover effect
- Name as heading (h3)
- Description truncated to 2 lines
- Role badge: purple for admin, blue for member
- Action buttons: inline at bottom
- Shadow on hover

**GroupsGrid:**
- Responsive: base=1, md=2, lg=3 columns
- Spacing: 6px between cards
- Max width: 1400px container

**Pagination:**
- Page indicator: "Page X of Y (N total)"
- Previous/Next buttons with disabled states
- Page dropdown selector

## Related Stories
- **2-1**: Create a New Group (link in Create button)
- **2-3**: View Group Details (navigated from View button)
- **2-4**: Join Group via Invite (link in empty state)
- **2-6**: Remove Members (leave functionality)

## Future Enhancements
- Infinite scroll instead of pagination
- Filter by role, member count, creation date
- Sort options (name, members, date)
- Group icons/avatars
- Archive/hide groups
- Favorite groups
- Recently accessed groups
- Quick stats (total members across groups)

## Risk Considerations
- **Performance**: Large number of groups (100+) - pagination handles this
- **Real-time**: Last activity date may be stale - refresh on view
- **Mobile**: Cards must be readable on small screens
- **Accessibility**: Cards must be keyboard navigable

## Testing Strategy
- Unit tests for components (rendering, props)
- Integration tests for API calls
- Functional tests for search/filter
- E2E tests for full user flow
- Edge cases: 0 groups, 100+ groups, network errors
