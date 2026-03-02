# Story 2-4: Join Group via Invite Link

**Epic:** 2 - Group Management
**Status:** Ready for Development
**Priority:** High
**Complexity:** Medium

## Narrative

As a user, I want to join a group using an invite link, so that I can quickly access groups my friends have invited me to.

## Acceptance Criteria

1. **Invite Link Format**
   - Invite links follow the pattern: `https://gettogether.app/join/{invite_code}`
   - Invite codes are 16-character hexadecimal strings (cryptographically generated)
   - Links can be shared via email, messaging, or social media

2. **Access Invite Page**
   - Users (authenticated or not) can navigate to `/join/{invite_code}`
   - Page displays group information: name, description, member count
   - Page shows "Join" button prominently

3. **Unauthenticated User Flow**
   - Unauthenticated users see group info
   - "Join" button redirects to login with return URL
   - After login, user is returned to join flow
   - User confirms join and becomes group member

4. **Authenticated User Flow**
   - Authenticated users see group info
   - Click "Join Group" button
   - User is added to group_memberships with role='member'
   - Redirected to group details page
   - Toast notification confirms successful join

5. **Error Handling**
   - Invalid invite code → 404 error page
   - Expired/revoked invite code → error message
   - User already a member → navigate to group details page
   - Already joined → "You're already a member" message

6. **User Experience**
   - Loading state while checking invite code validity
   - Error messages are user-friendly
   - Success feedback via toast notification
   - Smooth redirection to group after join

## Technical Requirements

### Database
- Query group by invite_code from `groups` table
- Add user to `group_memberships` table with role='member'
- Handle duplicate membership (unique constraint)

### API Endpoint
- `POST /api/groups/join/{invite_code}` - Join group via invite
  - Require: Authentication (JWT token)
  - Response: `{ success, message, group?, errorCode? }`
  - Status: 200 (success), 401 (auth), 404 (not found), 409 (already member), 500 (error)

### Routes
- `/join/:invite_code` - Public page to join group via invite link
  - GET: Display group info and join form
  - POST: Submit join request (handled by form action)

### Components
- `JoinGroupPage` - Page component at `app/join/[invite_code]/page.tsx`
- `JoinGroupForm` - Form component at `components/groups/JoinGroupForm.tsx`
- `GroupPreview` - Display group info before joining

### Service Layer
- `joinGroup(inviteCode: string)` - Client-side service function
- Server-side: `joinGroupByInviteCode(inviteCode, userId)` - Database operation

## Implementation Tasks

### Task 2.1: Create Join Endpoint
- Create `POST /api/groups/join/:invite_code` endpoint
- Validate invite code exists and maps to valid group
- Add user to group_memberships
- Handle errors (404, 409, 500)
- Return group details on success

### Task 2.2: Create Database Service
- `getGroupByInviteCode(inviteCode)` - Already exists in queries.ts
- `addUserToGroup(groupId, userId)` - Already exists in queries.ts
- Create transaction-based join logic

### Task 2.3: Create Join Page
- Create `app/join/[invite_code]/page.tsx`
- Display group preview (name, description, member count)
- Handle loading and error states
- Redirect unauthenticated users to login

### Task 2.4: Create Join Form Component
- Create `components/groups/JoinGroupForm.tsx`
- Single "Join Group" button
- Loading state during submission
- Success/error handling
- Integration with join service

### Task 2.5: Create Group Preview Component
- Create `components/groups/GroupPreview.tsx`
- Display group card with name, description, member count
- Show member avatars
- Read-only view (no editing)

### Task 2.6: Add Service Layer Functions
- `joinGroup(inviteCode)` - Client service to call API
- `joinGroupByInviteCode(inviteCode, userId)` - Server service

### Task 2.7: Add Pagination for Preview Members
- Show first 5 members with avatars
- "See all members" link to group details (after join)

### Task 2.8: Write Comprehensive Tests
- API endpoint tests (all scenarios)
- Page component tests
- Form component tests
- Edge cases and error scenarios

## Acceptance Criteria Mapping

| Criteria | Implementation | Testing |
|----------|-----------------|---------|
| Invite link format | invite_code in URL path | URL format tests |
| Access invite page | /join/:invite_code route | Page load tests |
| Unauthenticated flow | Redirect to login with returnUrl | Auth flow tests |
| Authenticated join | API call + redirect | Join flow tests |
| Error handling | 404, 409, etc. responses | Error tests |
| UX feedback | Toast + loading states | Component tests |

## Database Schema (Existing)

```sql
-- groups table
- invite_code (VARCHAR 16, UNIQUE)
- name, description, created_by, created_at, updated_at

-- group_memberships table
- group_id (FK to groups)
- user_id (UUID from Cognito)
- role ('admin' or 'member')
- joined_at
- UNIQUE(group_id, user_id)
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Successfully joined group",
  "group": {
    "id": "uuid",
    "name": "Group Name",
    "description": "Description",
    "member_count": 5,
    "members": [...]
  }
}
```

### Error Responses
- 401: `{ success: false, errorCode: "UNAUTHORIZED" }`
- 404: `{ success: false, errorCode: "INVALID_INVITE_CODE" }`
- 409: `{ success: false, errorCode: "ALREADY_MEMBER" }`
- 500: `{ success: false, errorCode: "INTERNAL_ERROR" }`

## Related Stories
- **2-1**: Create a New Group (creates invite code)
- **2-2**: View Groups List (shows groups user is member of)
- **2-3**: View Group Details (redirected to after join)

## Notes

- Invite codes are cryptographically secure (16 hex chars = 64 bits entropy)
- No expiration on invite codes initially (can be added in future)
- Revoked invites not implemented (can be added in future)
- Admins can share group links via email or messaging apps
- Rate limiting recommended for join endpoint (prevent abuse)

## Risk Considerations

- **Security**: Invite codes should not be guessable (currently using randomBytes - secure)
- **Performance**: Large groups with many members - pagination handles this
- **User Experience**: Clear error messages prevent confusion
- **Data Consistency**: UNIQUE constraint prevents duplicate memberships
