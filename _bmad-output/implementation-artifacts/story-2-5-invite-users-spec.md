# Story 2-5: Invite Users to Group - Specification

**Epic:** 2 - Group Management
**Status:** Specification Complete
**Date:** 2026-03-02

---

## User Story

**As a** group admin
**I want to** invite existing users to join my group
**So that** I can grow my group and coordinate with more people

---

## Narrative

Admin users can send invitations to other users in the system to join their groups. Users receive notifications/can view invitations, and can accept or decline them. This allows for more direct group building compared to share-link invitations.

---

## Acceptance Criteria

### Invitation Management
- [ ] Admin can access invite UI from group details page
- [ ] Admin can search for users by email/username in system
- [ ] Admin can view list of pending invitations for a group
- [ ] Admin can revoke an invitation before it's accepted
- [ ] Admin can resend an invitation (creates new invite, old one invalid)
- [ ] Cannot invite user who is already a member
- [ ] Cannot invite non-existent users
- [ ] Cannot invite self

### User Invitations
- [ ] Invited users see invitations on their profile/dashboard
- [ ] Users can accept an invitation
- [ ] Users can decline/reject an invitation
- [ ] Users can view group preview before accepting
- [ ] Accepting adds user with role='member'
- [ ] Rejecting deletes the invitation

### Notifications
- [ ] Toast notification when invitation sent successfully
- [ ] Toast notification for errors (duplicate invite, user not found, etc.)
- [ ] Error states handled gracefully

### Edge Cases
- [ ] Pagination for large user lists in search
- [ ] Pagination for large invitation lists
- [ ] Search debouncing to avoid excessive queries
- [ ] Invalid/expired invitations handled gracefully
- [ ] User deleted → invitation becomes invalid

---

## Technical Specification

### Database Schema

#### New Table: `group_invitations`
```sql
CREATE TABLE group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  UNIQUE(group_id, invited_user_id, status) -- only 1 pending invite per user per group
);

CREATE INDEX idx_invitations_user_status ON group_invitations(invited_user_id, status);
CREATE INDEX idx_invitations_group_status ON group_invitations(group_id, status);
```

### API Endpoints

#### 1. Search Users for Invitation
```
GET /api/groups/{groupId}/invite-search?q={query}&limit=10&offset=0

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "alreadyMember": false,
      "hasPendingInvite": false
    }
  ],
  "total": 15,
  "hasMore": true
}

Error (400):
{
  "success": false,
  "error": "Search query too short",
  "errorCode": "INVALID_SEARCH_QUERY"
}

Error (403):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}
```

#### 2. Send Invitation
```
POST /api/groups/{groupId}/invitations

Headers:
  x-user-id: {userId}
  Content-Type: application/json

Body:
{
  "invitedUserId": "uuid"
}

Response (201 Created):
{
  "success": true,
  "message": "Invitation sent",
  "invitation": {
    "id": "uuid",
    "groupId": "uuid",
    "invitedUserId": "uuid",
    "status": "pending",
    "expiresAt": "ISO8601"
  }
}

Error (400 - Already member):
{
  "success": false,
  "error": "User is already a member",
  "errorCode": "USER_ALREADY_MEMBER"
}

Error (400 - Duplicate invite):
{
  "success": false,
  "error": "Invitation already pending",
  "errorCode": "INVITE_ALREADY_PENDING"
}

Error (403):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}

Error (404):
{
  "success": false,
  "error": "User not found",
  "errorCode": "USER_NOT_FOUND"
}
```

#### 3. Get Pending Invitations for Group
```
GET /api/groups/{groupId}/invitations?status=pending&limit=10&offset=0

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "invitations": [
    {
      "id": "uuid",
      "invitedUser": {
        "id": "uuid",
        "email": "user@example.com",
        "username": "username"
      },
      "status": "pending",
      "invitedAt": "ISO8601",
      "expiresAt": "ISO8601"
    }
  ],
  "total": 5,
  "hasMore": false
}

Error (403):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}
```

#### 4. Revoke Invitation
```
DELETE /api/groups/{groupId}/invitations/{invitationId}

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "message": "Invitation revoked"
}

Error (403):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}

Error (404):
{
  "success": false,
  "error": "Invitation not found",
  "errorCode": "INVITATION_NOT_FOUND"
}
```

#### 5. Get User's Invitations
```
GET /api/user/invitations?status=pending&limit=10&offset=0

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "invitations": [
    {
      "id": "uuid",
      "group": {
        "id": "uuid",
        "name": "Group Name",
        "description": "...",
        "memberCount": 5
      },
      "invitedBy": {
        "id": "uuid",
        "username": "admin_user"
      },
      "status": "pending",
      "invitedAt": "ISO8601",
      "expiresAt": "ISO8601"
    }
  ],
  "total": 3,
  "hasMore": false
}
```

#### 6. Respond to Invitation (Accept/Decline)
```
POST /api/invitations/{invitationId}/respond

Headers:
  x-user-id: {userId}
  Content-Type: application/json

Body:
{
  "action": "accept" | "decline"
}

Response (200 OK):
{
  "success": true,
  "message": "Invitation accepted",
  "groupId": "uuid"
}

Error (400 - Invalid action):
{
  "success": false,
  "error": "Invalid action",
  "errorCode": "INVALID_ACTION"
}

Error (409 - Already responded):
{
  "success": false,
  "error": "Invitation already responded to",
  "errorCode": "ALREADY_RESPONDED"
}

Error (410 - Expired):
{
  "success": false,
  "error": "Invitation has expired",
  "errorCode": "INVITATION_EXPIRED"
}
```

---

## Component Architecture

### Pages
1. **app/groups/[groupId]/page.tsx** (existing)
   - Add "Invite Members" button
   - Update AdminGroupSettings to include invite management modal

### New Components
1. **InviteUserModal.tsx**
   - Modal to search and invite users
   - User search with debouncing
   - Select/unselect users
   - Bulk invite option
   - Loading and error states

2. **UserSearchResults.tsx**
   - Display search results
   - Show if already member or has pending invite
   - Select checkbox for bulk operations

3. **PendingInvitationsList.tsx**
   - List of pending invitations for group
   - Show invited user info
   - Revoke button with confirmation
   - Pagination

4. **UserInvitationsList.tsx** (for user dashboard)
   - Show invitations received by user
   - Group preview
   - Accept/Decline buttons
   - Pagination

---

## Service Layer

### Client Services (lib/services/groupService.ts)
```typescript
inviteUserToGroup(groupId: string, invitedUserId: string): Promise<Response>
searchUsersForInvite(groupId: string, query: string, limit?: number): Promise<Response>
getPendingInvitations(groupId: string, limit?: number): Promise<Response>
revokeInvitation(groupId: string, invitationId: string): Promise<Response>
getUserInvitations(limit?: number): Promise<Response>
respondToInvitation(invitationId: string, action: 'accept' | 'decline'): Promise<Response>
```

### Database Queries (lib/db/queries.ts)
```typescript
// Create invitation
createInvitation(groupId, invitedUserId, invitedByUserId)

// Get pending invitations for group
getPendingInvitationsForGroup(groupId, limit, offset)

// Check if user has pending invite
hasPendingInvitation(groupId, userId)

// Get user's invitations
getUserInvitations(userId, status, limit, offset)

// Update invitation status
updateInvitationStatus(invitationId, status)

// Revoke invitation
revokeInvitation(invitationId)

// Check if user already member
isGroupMember(groupId, userId)

// Search users by email/username
searchUsers(query, limit, offset)
```

---

## Validation Rules

### Search Query
- Min length: 2 characters
- Max length: 100 characters
- Trimmed before search
- No special regex characters

### Invitation
- Cannot invite user who doesn't exist
- Cannot invite user already in group
- Cannot invite self
- Cannot invite if not group admin
- Only one pending invitation per (group, user) pair
- Expires after 30 days

### User Search
- Return max 20 results per request
- Hide email from non-admins (show only for admins)
- Show membership status
- Show pending invite status

---

## Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|-----------|---------|
| User not found | 404 | USER_NOT_FOUND | User not found |
| Already a member | 400 | USER_ALREADY_MEMBER | User is already a member |
| Invitation pending | 400 | INVITE_ALREADY_PENDING | Invitation already pending |
| Not authorized (not admin) | 403 | NOT_GROUP_ADMIN | Not authorized |
| Invitation not found | 404 | INVITATION_NOT_FOUND | Invitation not found |
| Invitation expired | 410 | INVITATION_EXPIRED | Invitation has expired |
| Already responded | 409 | ALREADY_RESPONDED | Invitation already responded to |
| Group not found | 404 | GROUP_NOT_FOUND | Group not found |
| Search query invalid | 400 | INVALID_SEARCH_QUERY | Search query must be 2-100 characters |

---

## UX Patterns

### Invitation Flow (Admin)
1. Open group details
2. Click "Invite Members" or admin settings
3. Modal opens with search box
4. Type name/email to search
5. See search results with status indicators
6. Select users to invite
7. Click "Send Invitations"
8. Toast notification with result
9. See pending invitations list
10. Can revoke individual invitations

### Invitation Flow (Invited User)
1. User receives notification or checks their invitations
2. User sees list of invitations
3. Clicks on group invitation to see preview
4. Clicks "Accept" to join
5. Redirected to group details
6. Or clicks "Decline" to reject
7. Invitation disappears from list

---

## Performance Considerations

- **Search debouncing**: 300ms delay on user search to reduce queries
- **Pagination**: Limit search results to 20, invitations to 10 per page
- **Indexes**: On (user_id, status) and (group_id, status) for fast queries
- **Unique constraint**: Prevent duplicate pending invitations at DB level
- **Expiry**: Auto-cleanup of expired invitations via cron job (future enhancement)

---

## Dependencies

- react (hooks: useState, useCallback, useEffect)
- next/navigation (useRouter)
- @chakra-ui/react (Modal, Input, Button, List, etc.)
- @/lib/services/groupService
- @/lib/contexts/AuthContext
- lodash (debounce)

---

## Future Enhancements

1. **Bulk Invitations**: Invite multiple users at once
2. **Email Notifications**: Send actual email to invited users
3. **Invitation Expiry**: Auto-expire invitations after 30 days
4. **Invitation History**: Show accepted/declined invitation history
5. **Resend Invitation**: Resend expired invitations
6. **Invitation Preferences**: Users can disable invitations
7. **Comment on Invite**: Admin can add message with invitation
8. **Group Invite Links**: Generate shareable links (different from direct user invites)
9. **Invitation Templates**: Admin can create custom invitation messages
10. **Batch Operations**: Bulk revoke pending invitations

---

## Known Limitations

- Invitations only work for users already in the system
- No email notifications (requires email service setup)
- No way to add users who are not yet registered
- Expiration cleanup is manual (should be automated)
- No invitation message/notes from inviter
- No way to customize invitation text

---

## Related Stories

- **2-1**: Create Group - prerequisite
- **2-3**: View Group Details - admin settings integration point
- **2-4**: Join Group via Invite - alternative invitation method (share link)
- **2-6**: Remove Members - admin can revoke membership
- **2-7**: Update Group Settings - admin settings panel

---

## Testing Strategy

### Unit Tests
- Validation functions
- Service layer functions
- Component behavior

### Integration Tests
- Search users and invite flow
- Respond to invitation flow
- Revoke invitation flow
- Permission checks (non-admin cannot invite)

### E2E Tests
- Full invitation workflow: admin invites → user accepts → user joins group
- Full rejection workflow
- Expired invitation handling
- Search and pagination

---

## Acceptance Criteria Checklist

- [ ] Users can be searched by email/username
- [ ] Invitations can be sent to existing users
- [ ] Users can view invitations they've received
- [ ] Users can accept/decline invitations
- [ ] Admins can revoke pending invitations
- [ ] Cannot invite already-members
- [ ] Cannot invite self
- [ ] Proper error handling for all edge cases
- [ ] Toast notifications for actions
- [ ] Pagination for lists
- [ ] Search debouncing implemented
- [ ] All endpoints secured (auth required)
- [ ] Admin-only endpoints verified
- [ ] Comprehensive test coverage
- [ ] TypeScript strict mode compliance
- [ ] Chakra UI accessibility standards

---

**Spec Created:** 2026-03-02
**Status:** Ready for Implementation
**Story ID:** 2-5
**Epic:** Epic 2 - Group Management
