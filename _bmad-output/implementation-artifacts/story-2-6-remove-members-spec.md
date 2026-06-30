# Story 2-6: Remove Members from Group - Specification

**Epic:** 2 - Group Management
**Status:** Specification Complete
**Date:** 2026-03-02

---

## User Story

**As a** group admin
**I want to** remove members from my group
**So that** I can maintain group membership and remove inactive or inappropriate members

---

## Narrative

Admins can remove members from their groups. Removed members lose access to the group and its content. Admins can remove any member except themselves (would need to delete group or transfer ownership). When a member is removed, they're notified (future: via notification system).

---

## Acceptance Criteria

### Remove Member Functionality
- [ ] Admin can view list of group members
- [ ] Admin can remove individual members
- [ ] Confirmation dialog before removal
- [ ] Removed member loses group access immediately
- [ ] Removed member deleted from group_memberships table
- [ ] Cannot remove self (shows error)
- [ ] Cannot remove group creator without transfer (future enhancement)
- [ ] Toast notification on success/error

### Permission Checks
- [ ] Only group admin can remove members
- [ ] Non-admins cannot access remove functionality
- [ ] Cannot remove users from groups you don't belong to
- [ ] Removed member cannot rejoin without re-invitation or new invite code

### Restrictions
- [ ] Cannot remove self
- [ ] Cannot remove last admin (if implemented)
- [ ] Can only remove members, not pending invitations

### Edge Cases
- [ ] Handle removing already-removed members gracefully
- [ ] Handle user deletion (cascade removes from group)
- [ ] Prevent race conditions (member removed while viewing)
- [ ] Member removed shows proper error if they reload

---

## Technical Specification

### API Endpoints

#### 1. DELETE /api/groups/{groupId}/members/{memberId}
```
DELETE /api/groups/{groupId}/members/{memberId}

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "message": "Member removed from group"
}

Error (400 - Cannot remove self):
{
  "success": false,
  "error": "Cannot remove yourself from group",
  "errorCode": "CANNOT_REMOVE_SELF"
}

Error (403 - Not authorized):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}

Error (404):
{
  "success": false,
  "error": "Member not found",
  "errorCode": "MEMBER_NOT_FOUND"
}
```

#### 2. GET /api/groups/{groupId}/members
```
GET /api/groups/{groupId}/members?limit=10&offset=0

Headers:
  x-user-id: {userId}

Response (200 OK):
{
  "success": true,
  "members": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "role": "admin" | "member",
      "joinedAt": "ISO8601",
      "isCurrentUser": false
    }
  ],
  "total": 25,
  "hasMore": true
}

Error (401):
{
  "success": false,
  "error": "Not authenticated",
  "errorCode": "NOT_AUTHENTICATED"
}

Error (403):
{
  "success": false,
  "error": "Not a member of this group",
  "errorCode": "NOT_GROUP_MEMBER"
}

Error (404):
{
  "success": false,
  "error": "Group not found",
  "errorCode": "GROUP_NOT_FOUND"
}
```

#### 3. PATCH /api/groups/{groupId}/members/{memberId}
```
PATCH /api/groups/{groupId}/members/{memberId}

Headers:
  x-user-id: {userId}
  Content-Type: application/json

Body (for role changes):
{
  "role": "admin" | "member"
}

Response (200 OK):
{
  "success": true,
  "message": "Member role updated"
}

Error (403 - Not authorized):
{
  "success": false,
  "error": "Not authorized",
  "errorCode": "NOT_GROUP_ADMIN"
}

Error (400 - Cannot demote last admin):
{
  "success": false,
  "error": "Cannot demote last admin",
  "errorCode": "LAST_ADMIN_CANNOT_DEMOTE"
}
```

---

## Component Architecture

### Pages
**app/groups/[groupId]/page.tsx** (existing)
- Integrate MemberListWithActions component
- Show member management section for admins

### Components
1. **MemberListWithActions.tsx**
   - Display members with pagination
   - Remove button for each member
   - Promote/demote role buttons (admin only)
   - Admin indicator badge
   - Current user indicator ("You")
   - Loading and error states

2. **RemoveMemberDialog.tsx**
   - Confirmation dialog before removing
   - Show member being removed
   - Warning about losing access
   - Cancel/Confirm buttons
   - Loading state during removal

---

## Service Layer

### Client Services (lib/services/groupService.ts)
```typescript
getGroupMembers(groupId: string, limit?: number, offset?: number): Promise<Response>
removeMember(groupId: string, memberId: string): Promise<Response>
updateMemberRole(groupId: string, memberId: string, role: string): Promise<Response>
```

### Database Queries (lib/db/queries/groups.ts)
```typescript
getGroupMembers(groupId, limit, offset) // Returns member list with count
removeMember(groupId, memberId) // Delete from group_memberships
updateMemberRole(groupId, memberId, role) // Update member role
getAdminCount(groupId) // Check if last admin
```

---

## Validation Rules

### Remove Member
- Admin must be verified before removal
- Cannot remove self
- Cannot remove from group you don't belong to
- Member must exist and be in group
- User requesting removal must be admin

### Role Update
- Cannot demote last admin
- Only admins can change roles
- Role must be valid (admin/member)

---

## Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|-----------|---------|
| User tries to remove self | 400 | CANNOT_REMOVE_SELF | Cannot remove yourself |
| Not group admin | 403 | NOT_GROUP_ADMIN | Not authorized |
| Member not found | 404 | MEMBER_NOT_FOUND | Member not found |
| Not a member of group | 403 | NOT_GROUP_MEMBER | Not a member |
| Last admin demotion | 400 | LAST_ADMIN_CANNOT_DEMOTE | Cannot demote last admin |
| Group not found | 404 | GROUP_NOT_FOUND | Group not found |
| Not authenticated | 401 | NOT_AUTHENTICATED | Not authenticated |

---

## UX Patterns

### Remove Member Flow
1. Open group details page
2. Admin sees "Members" section with list
3. Click member or "Remove" button
4. Confirmation dialog appears
5. Review member info and warning
6. Click "Remove" to confirm
7. Toast notification shows success
8. Member disappears from list
9. Member redirected to groups list (if viewing own profile)

### Member List Display
- Show all members with join date
- Show member role (admin/member badge)
- Show "You" indicator for current user
- Remove button (only visible to admins)
- Role change dropdown (admin only)
- Pagination for large groups

### Error Scenarios
- Try to remove self → error message, button disabled
- Try to remove from group not in → error toast
- Network error during removal → error toast, retry available
- Member removed while viewing → notification

---

## Database Operations

### Delete from group_memberships
```sql
DELETE FROM group_memberships
WHERE group_id = $1 AND user_id = $2;
```

### Update member role
```sql
UPDATE group_memberships
SET role = $3
WHERE group_id = $1 AND user_id = $2;
```

### Get member count by role
```sql
SELECT COUNT(*) FROM group_memberships
WHERE group_id = $1 AND role = $2;
```

---

## Performance Considerations

- **Pagination**: 10 members per page default
- **Indexes**: On group_id, user_id in group_memberships
- **Connection pooling**: Use existing pool
- **Query optimization**: Combine member fetch with role/status info

---

## Security Considerations

- **Authorization**: Check admin role at API level
- **Authentication**: Verify x-user-id header
- **Input validation**: UUID format for IDs
- **SQL injection prevention**: Use parameterized queries
- **Race conditions**: Check member exists before delete

---

## Dependencies

- react (hooks: useState, useCallback)
- next/navigation (useRouter)
- @chakra-ui/react (Alert, Dialog, Button, Badge, etc.)
- @/lib/services/groupService
- @/lib/contexts/AuthContext

---

## Future Enhancements

1. **Bulk Remove**: Select and remove multiple members at once
2. **Ban Members**: Prevent specific users from joining again
3. **Promote/Demote**: Change member roles (member ↔ admin)
4. **Member Permissions**: Granular permissions (editor, moderator, etc.)
5. **Activity Tracking**: Show last activity date for members
6. **Member Search**: Search members within group
7. **Member Deactivation**: Temporarily disable members without removing
8. **Auto-Remove**: Remove inactive members after X days
9. **Member Notifications**: Alert removed members
10. **Audit Log**: Track who removed whom and when

---

## Known Limitations

- No bulk removal yet
- No member banning
- No fine-grained permissions
- No last admin protection (can remove all admins)
- No auto-removal of inactive members
- No notification to removed member
- Cannot transfer group ownership

---

## Related Stories

- **2-1**: Create Group
- **2-3**: View Group Details - member list displayed here
- **2-5**: Invite Users to Group
- **2-7**: Update Group Settings
- **2-9**: Delete Group

---

## Testing Strategy

### Unit Tests
- Remove member permission checks
- Self-removal prevention
- Service function error handling

### Integration Tests
- Full remove flow: admin → confirm → remove → success
- Error handling: try remove self, try remove from foreign group
- Member list updates after removal

### E2E Tests
- Admin removes member from UI
- Removed member can't access group
- Member list reflects removal
- Error states handled correctly

---

## Acceptance Criteria Checklist

- [ ] Members can be removed by group admin
- [ ] Confirmation dialog before removal
- [ ] Cannot remove self
- [ ] Toast notification on success/error
- [ ] Removed member removed from database
- [ ] Only admins can remove members
- [ ] Member list displays all members
- [ ] Pagination works for large groups
- [ ] Error messages are descriptive
- [ ] All endpoints secured with auth
- [ ] TypeScript strict mode compliance
- [ ] Chakra UI accessibility standards met
- [ ] Comprehensive test coverage
- [ ] Dev notes and spec documentation

---

**Spec Created:** 2026-03-02
**Status:** Ready for Implementation
**Story ID:** 2-6
**Epic:** Epic 2 - Group Management
