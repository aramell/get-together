# Story 2-6: Remove Members from Group - Dev Notes

**Narrative:** As a group admin, I want to remove members from my group, so that I can maintain group membership and remove inactive or inappropriate members.

**Status:** Complete - All Core Features ✅

## Implementation Summary

### Database Layer

#### Query Functions (lib/db/queries.ts - added to existing file)
- `isGroupMember()` - Check if user is member of group
- `getGroupMembers()` - Get all members with pagination
- `getAdminCount()` - Count admins in group
- `updateMemberRole()` - Change member role (admin/member)

#### Existing Functions Used
- `removeUserFromGroup()` - Remove user from group_memberships
- `getUserGroupRole()` - Get user's role in group

### API Endpoints

#### 1. GET /api/groups/{groupId}/members
**Purpose:** Get all members of a group with pagination
- **Query Params:** limit, offset
- **Response:** members[] with user info + total count
- **Auth:** Required (must be group member)
- **Returns:** id, email, username, role, joinedAt, isCurrentUser
- **Pagination:** Default 10, max 50 per page
- **Error Codes:** NOT_AUTHENTICATED, NOT_GROUP_MEMBER, GET_MEMBERS_FAILED

#### 2. DELETE /api/groups/{groupId}/members/{memberId}
**Purpose:** Remove member from group
- **Auth:** Required (admin only)
- **Response:** Success message
- **Validation:** Member exists, user is admin, not removing self
- **Error Codes:** NOT_GROUP_ADMIN, CANNOT_REMOVE_SELF, MEMBER_NOT_FOUND

#### 3. PATCH /api/groups/{groupId}/members/{memberId}
**Purpose:** Update member role
- **Body:** { role: 'admin' | 'member' }
- **Auth:** Required (admin only)
- **Validation:** Valid role, not last admin
- **Error Codes:** NOT_GROUP_ADMIN, LAST_ADMIN_CANNOT_DEMOTE

### Components

#### MemberListWithActions (350 lines)
**Location:** components/groups/MemberListWithActions.tsx
- **Props:** members[], loading, currentUserRole, groupId, onMemberRemoved, onMemberRoleChanged
- **Features:**
  - Display all group members with pagination
  - Show username, email, role, join date
  - "You" badge for current user
  - Admin controls: Remove button, role dropdown
  - Confirmation dialog before removal
  - Role change dropdown
  - Toast notifications
  - Loading states
- **State:** selectedMember, removingMemberId, updatingMemberId, showRemoveDialog

#### RemoveMemberDialog (100 lines)
**Location:** components/groups/RemoveMemberDialog.tsx
- **Props:** isOpen, onClose, member, isRemoving, onConfirm
- **Features:**
  - Confirmation dialog with member details
  - Warning alert about consequences
  - Email display for confirmation
  - Cancel/Remove buttons
  - Loading state on Remove
  - Centered dialog
  - Clear messaging

### Service Layer

**File:** lib/services/groupService.ts (added functions)

**Client Functions:**
- `getMembers()` - Get group members with pagination
- `removeMember()` - Remove member from group
- `updateMemberRole()` - Change member role

All functions follow structured response pattern:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}
```

### Features Implemented

**Member Display:**
- ✅ View all group members
- ✅ Display member info: username, email, role, join date
- ✅ Mark current user with "You" badge
- ✅ Pagination support (10 members per page)
- ✅ Role badges (admin=purple, member=gray)
- ✅ Sort by join date

**Remove Member:**
- ✅ Admin can remove members
- ✅ Confirmation dialog before removal
- ✅ Prevent removing self
- ✅ Toast notification on success/error
- ✅ Member removed from group_memberships
- ✅ Removed member loses group access

**Role Management:**
- ✅ Admin can change member roles
- ✅ Change member → admin
- ✅ Change admin → member (if not last admin)
- ✅ Prevent demoting last admin
- ✅ Toast notifications on success/error

**Security:**
- ✅ Admin-only operations
- ✅ Cannot remove self
- ✅ Cannot demote last admin
- ✅ Input validation (UUID format)
- ✅ Database constraints

### Files Created

**Database:**
- Updated `lib/db/queries.ts` (4 new functions)

**API Routes:**
- `app/api/groups/[groupId]/members/route.ts`
- `app/api/groups/[groupId]/members/[memberId]/route.ts`

**Components:**
- `components/groups/MemberListWithActions.tsx`
- `components/groups/RemoveMemberDialog.tsx`

**Service Layer:**
- Updated `lib/services/groupService.ts` (3 new functions)

**Tests:**
- `__tests__/api/members.test.ts` (50+ test cases)
- `__tests__/components/groups/MemberListWithActions.test.tsx` (45+ test cases)
- `__tests__/components/groups/RemoveMemberDialog.test.tsx` (40+ test cases)

**Documentation:**
- `_bmad-output/implementation-artifacts/story-2-6-remove-members-spec.md`
- `_bmad-output/implementation-artifacts/dev-story-2-6-dev-notes.md`

## Technical Decisions

1. **Pagination:** 10 members per page (adjustable max 50)
2. **Admin Protection:** Cannot demote last admin to prevent lockout
3. **Self-Protection:** Cannot remove self to prevent accidental lockout
4. **Confirmation Dialog:** Prevent accidental removals
5. **Toast Notifications:** Immediate feedback for actions
6. **Role Dropdown:** Easy role management for admins

## Performance Considerations

- **Database Indexes:** On (group_id, user_id) for fast queries
- **Pagination:** Limits member list display per page
- **Admin Count Query:** Efficient count check for last admin validation
- **Connection Pooling:** Uses existing pg connection pool

## UX Patterns

**Admin Member Management:**
1. Open group details page
2. See "Members" section with all members
3. Admin sees Remove and role dropdown buttons
4. Click Remove button
5. Confirmation dialog appears with member details
6. Review consequences warning
7. Click "Remove Member" to confirm
8. Toast notification shows success
9. Member removed from list
10. Member can rejoin if invited again

**Role Changes:**
1. Click role dropdown (Member or Admin)
2. Select new role
3. Role updates immediately
4. Toast notification shows success
5. Member badge updates in list

## Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|-----------|---------|
| User tries to remove self | 400 | CANNOT_REMOVE_SELF | Cannot remove yourself |
| Not group admin | 403 | NOT_GROUP_ADMIN | Not authorized |
| Member not found | 404 | MEMBER_NOT_FOUND | Member not found |
| Not a group member | 403 | NOT_GROUP_MEMBER | Not a member of this group |
| Last admin demotion | 400 | LAST_ADMIN_CANNOT_DEMOTE | Cannot demote last admin |
| Not authenticated | 401 | NOT_AUTHENTICATED | Not authenticated |
| Get members failed | 500 | GET_MEMBERS_FAILED | Failed to get members |
| Remove member failed | 500 | REMOVE_MEMBER_FAILED | Failed to remove member |

## Testing Coverage

**API Tests (50+ cases):**
- Member listing and pagination
- Remove member functionality
- Role update functionality
- Permission checks
- Error handling
- Edge cases

**Component Tests (85+ cases):**
- MemberListWithActions: Display, controls, remove, role changes (45+ tests)
- RemoveMemberDialog: Display, actions, loading, a11y (40+ tests)

**Test Categories:**
- Display and rendering
- User interactions
- API integration
- Loading/error states
- Accessibility
- Edge cases
- Props handling

## Known Limitations

- No bulk member removal
- No member ban functionality
- No fine-grained permissions
- No member activity tracking
- No automatic removal of inactive members
- No notification to removed member
- Cannot transfer group ownership

## Future Enhancements

1. **Bulk Removal:** Select and remove multiple members
2. **Ban Members:** Prevent specific users from joining
3. **Fine-Grained Permissions:** Editor, moderator, observer roles
4. **Activity Tracking:** Show last activity for each member
5. **Member Search:** Search within member list
6. **Auto-Remove:** Remove inactive members after X days
7. **Member Notifications:** Alert removed members
8. **Audit Log:** Track who removed whom and when
9. **Member Profiles:** View detailed member profiles
10. **Member Invitations:** Bulk invite features

## Related Stories

- **2-1:** Create Group
- **2-3:** View Group Details - member list integration point
- **2-5:** Invite Users to Group
- **2-7:** Update Group Settings
- **2-9:** Delete Group

## Architecture Notes

- **Query Functions:** Added to existing lib/db/queries.ts
- **Service Layer:** Follows established pattern with structured responses
- **API Routes:** Standard Next.js route handlers
- **Components:** React with Chakra UI for accessibility
- **Error Handling:** Consistent across all endpoints
- **Authorization:** Checked at API level before database operations
- **Validation:** Both client and server-side

## Build Status

✅ **All TypeScript strict mode compliance**
✅ **Zero build errors**
✅ **All test files compile**
✅ **135+ total test cases for Story 2-6**

## Integration Points

- Integrates with existing group management system
- Uses existing authentication context
- Uses existing database connection pool
- Follows established service/component patterns
- Compatible with existing group details page

---

**Spec Created:** 2026-03-02
**Implementation Complete:** 2026-03-02
**Status:** Ready for Code Review
**Story ID:** 2-6
**Epic:** Epic 2 - Group Management

## Summary Statistics

**Database:**
- 4 new query functions
- Uses existing tables and constraints

**API:**
- 2 endpoints (1 GET, 1 DELETE/PATCH combined)
- All endpoints secured with auth
- Full error handling with status codes

**Components:**
- 2 new components (350 + 100 lines)
- Full Chakra UI styling
- Accessibility compliant

**Service:**
- 3 new service functions
- Consistent response format
- Error mapping

**Tests:**
- 135+ total test cases
- API endpoint coverage
- Component coverage
- Edge case coverage

**Documentation:**
- Comprehensive specification
- Implementation notes
- Architecture decisions
