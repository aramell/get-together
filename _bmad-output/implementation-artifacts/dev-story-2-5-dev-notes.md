# Story 2-5: Invite Users to Group - Dev Notes

**Narrative:** As a group admin, I want to invite existing users to join my group, so that I can grow my group and coordinate with more people.

**Status:** Complete - All Core Features ✅

## Implementation Summary

### Database Layer

#### New Table: `group_invitations` (migrations/003_create_group_invitations_table.sql)
```sql
- id: UUID primary key
- group_id: FK to groups (ON DELETE CASCADE)
- invited_user_id: FK to users (ON DELETE CASCADE)
- invited_by_user_id: FK to users (creator of invitation)
- status: 'pending' | 'accepted' | 'declined'
- invited_at: TIMESTAMPTZ (created timestamp)
- responded_at: TIMESTAMPTZ (when user accepted/declined)
- expires_at: TIMESTAMPTZ (30 days from creation)
- UNIQUE constraint: (group_id, invited_user_id, status)
```

**Indexes:**
- `idx_group_invitations_user_status` - For user invitation queries
- `idx_group_invitations_group_status` - For group invitation queries
- `idx_group_invitations_expires_at` - For expiration checks

#### Query Functions (lib/db/queries/invitations.ts)
- `createInvitation()` - Create new invitation
- `getPendingInvitationsForGroup()` - Get pending invites with pagination
- `hasPendingInvitation()` - Check if pending invite exists
- `getUserInvitations()` - Get user's invitations (with pagination)
- `updateInvitationStatus()` - Accept/decline invitation
- `revokeInvitation()` - Admin revoke pending invitation
- `getInvitationById()` - Fetch invitation by ID
- `searchUsers()` - Search users for inviting (with status flags)

### API Endpoints

#### 1. GET /api/groups/{groupId}/invite-search
**Purpose:** Search users for inviting to group
- **Query Params:** q (search term), limit, offset
- **Response:** users[] with alreadyMember and hasPendingInvite flags
- **Auth:** Required
- **Validation:** Query min 2 chars, max 100 chars
- **Error Codes:** INVALID_SEARCH_QUERY, SEARCH_FAILED

#### 2. POST /api/groups/{groupId}/invitations
**Purpose:** Send invitation to user
- **Body:** { invitedUserId: uuid }
- **Response:** Created invitation object
- **Auth:** Required (admin only)
- **Validation:** UUID format, user not already member, not self
- **Error Codes:** NOT_GROUP_ADMIN, USER_ALREADY_MEMBER, INVITE_ALREADY_PENDING, CANNOT_INVITE_SELF

#### 3. GET /api/groups/{groupId}/invitations
**Purpose:** Get pending invitations for group
- **Query Params:** limit, offset
- **Response:** invitations[] with user info + total count
- **Auth:** Required (admin only)
- **Pagination:** Default 10, max 50 per page
- **Error Codes:** NOT_GROUP_ADMIN, GET_INVITATIONS_FAILED

#### 4. DELETE /api/groups/{groupId}/invitations/{invitationId}
**Purpose:** Revoke pending invitation
- **Auth:** Required (admin only)
- **Response:** Success message
- **Error Codes:** NOT_GROUP_ADMIN, INVITATION_NOT_FOUND

#### 5. GET /api/user/invitations
**Purpose:** Get user's invitations
- **Query Params:** status (pending/accepted/declined), limit, offset
- **Response:** invitations[] with group info + total count
- **Auth:** Required
- **Pagination:** Default 10, max 50 per page
- **Default Status:** 'pending'
- **Error Codes:** INVALID_STATUS, GET_INVITATIONS_FAILED

#### 6. POST /api/invitations/{invitationId}/respond
**Purpose:** Accept or decline invitation
- **Body:** { action: 'accept' | 'decline' }
- **Response:** Success + groupId (on accept)
- **Auth:** Required
- **On Accept:** Add user to group_memberships with role='member'
- **Validation:** User owns invitation, not already responded, not expired
- **Error Codes:** NOT_AUTHORIZED, ALREADY_RESPONDED, INVITATION_EXPIRED

### Components

#### InviteUserModal (360 lines)
**Location:** components/groups/InviteUserModal.tsx
- **Props:** isOpen, onClose, groupId, onInvitationSent
- **Features:**
  - Search input with 300ms debounce
  - User search results with status indicators
  - Checkboxes to select users
  - Bulk invite support
  - Success/error notifications
- **State:** searchQuery, searchResults, selectedUsers, loading, inviting, error
- **Validation:** Min 2 char search, max 100 chars

#### UserSearchResults (80 lines)
**Location:** components/groups/UserSearchResults.tsx
- **Props:** users[], selectedUsers, onToggleUser
- **Features:**
  - Display search results
  - Status badges: "Member", "Pending"
  - Disabled checkboxes for unavailable users
  - Clean list layout

#### PendingInvitationsList (220 lines)
**Location:** components/groups/PendingInvitationsList.tsx
- **Props:** invitations[], loading, onInvitationRevoked
- **Features:**
  - Display pending invitations
  - Revoke button with confirmation dialog
  - User info: username, email
  - Invitation dates: invitedAt, expiresAt
  - Toast notifications
- **State:** selectedInvitation, revoking, dialog open/close

#### UserInvitationsList (240 lines)
**Location:** components/groups/UserInvitationsList.tsx
- **Props:** invitations[], loading, onInvitationResponded
- **Features:**
  - Display invitations received by user
  - Accept/Decline buttons
  - Group preview: name, description, member count
  - Inviter information
  - Expiration status with styling
  - Toast notifications
- **State:** respondingTo (tracks which invitation being processed)

### Service Layer

**File:** lib/services/groupService.ts (added functions)

All functions follow structured response pattern:
```typescript
{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  errorCode?: string;
}
```

**Client Functions:**
- `searchUsersForInvite()` - Search users in group
- `inviteUserToGroup()` - Send invitation
- `getPendingInvitations()` - Get pending invites (admin)
- `revokeInvitation()` - Revoke invitation (admin)
- `getUserInvitations()` - Get user's invitations
- `respondToInvitation()` - Accept/decline

### Features Implemented

**Invitation Creation:**
- ✅ Search users by email/username
- ✅ Select multiple users to invite
- ✅ Prevent inviting already-members
- ✅ Prevent duplicate pending invites
- ✅ Prevent inviting self
- ✅ Toast notification on success/error
- ✅ 30-day expiration

**Invitation Management (Admin):**
- ✅ View pending invitations
- ✅ Revoke pending invitations
- ✅ Confirmation dialog before revoke
- ✅ Pagination for invitation lists
- ✅ Toast notification on revoke
- ✅ User info display (username, email)

**Invitation Response (User):**
- ✅ View received invitations
- ✅ Group preview before accepting
- ✅ Accept invitation (join group)
- ✅ Decline invitation (reject)
- ✅ See expiration dates
- ✅ Expired invitation handling
- ✅ Toast notifications

**Security:**
- ✅ Admin-only operations enforced
- ✅ User can only respond to own invitations
- ✅ Input validation (UUID, query length)
- ✅ Expiration enforcement
- ✅ Database constraints prevent duplicates

### Files Created

**Database:**
- `migrations/003_create_group_invitations_table.sql`
- `lib/db/queries/invitations.ts` (7 query functions)

**API Routes:**
- `app/api/groups/[groupId]/invite-search/route.ts`
- `app/api/groups/[groupId]/invitations/route.ts`
- `app/api/groups/[groupId]/invitations/[invitationId]/route.ts`
- `app/api/user/invitations/route.ts`
- `app/api/invitations/[invitationId]/respond/route.ts`

**Components:**
- `components/groups/InviteUserModal.tsx`
- `components/groups/UserSearchResults.tsx`
- `components/groups/PendingInvitationsList.tsx`
- `components/groups/UserInvitationsList.tsx`

**Service Layer:**
- Updated `lib/services/groupService.ts` (6 new functions)

**Tests:**
- `__tests__/api/invitations.test.ts` (60+ test cases)
- `__tests__/components/groups/InviteUserModal.test.tsx` (40+ test cases)
- `__tests__/components/groups/PendingInvitationsList.test.tsx` (30+ test cases)
- `__tests__/components/groups/UserInvitationsList.test.tsx` (35+ test cases)

**Documentation:**
- `_bmad-output/implementation-artifacts/story-2-5-invite-users-spec.md`
- `_bmad-output/implementation-artifacts/dev-story-2-5-dev-notes.md`

## Technical Decisions

1. **Search Debouncing:** 300ms debounce on user search to reduce API calls
2. **Bulk Invitations:** Support inviting multiple users at once
3. **30-Day Expiration:** Invitations expire automatically after 30 days
4. **Unique Constraint:** Database constraint prevents duplicate pending invites
5. **Cascade Deletion:** Deleting group/user auto-deletes related invitations
6. **Toast Notifications:** Immediate feedback for all user actions
7. **Confirmation Dialogs:** Confirmation for destructive actions (revoke)

## Performance Considerations

- **Database Indexes:** On (user_id, status), (group_id, status), expires_at
- **Pagination:** Search results limited to 20, invitations to 10-50 per page
- **Search Debouncing:** Prevents excessive API calls
- **Unique Constraint:** Database prevents duplicate pending invitations
- **Connection Pooling:** Uses existing pg connection pool

## UX Patterns

**Admin Inviting Flow:**
1. Open group details page
2. Click "Invite Members" button
3. Search for users by email/username
4. Select users to invite (checkboxes)
5. Click "Send Invitations"
6. Toast notification with results
7. See pending invitations list
8. Can revoke individual invitations

**User Receiving Flow:**
1. User sees invitations on dashboard
2. Views group preview
3. Clicks "Accept" to join or "Decline" to reject
4. Toast notification with result
5. Redirects to group (on accept)

## Error Handling

| Scenario | HTTP Status | Error Code |
|----------|-------------|-----------|
| Search query too short | 400 | INVALID_SEARCH_QUERY |
| User already member | 400 | USER_ALREADY_MEMBER |
| Invite already pending | 400 | INVITE_ALREADY_PENDING |
| Cannot invite self | 400 | CANNOT_INVITE_SELF |
| Not group admin | 403 | NOT_GROUP_ADMIN |
| User not found | 404 | USER_NOT_FOUND |
| Invitation not found | 404 | INVITATION_NOT_FOUND |
| Invitation expired | 410 | INVITATION_EXPIRED |
| Already responded | 409 | ALREADY_RESPONDED |
| Not authenticated | 401 | NOT_AUTHENTICATED |

## Testing Coverage

**API Tests (60+ cases):**
- User search functionality
- Invitation creation
- Permission checks
- Duplicate prevention
- Response format validation
- Error handling
- Edge cases

**Component Tests (105+ cases):**
- InviteUserModal: Search, selection, sending (40+ tests)
- PendingInvitationsList: Display, revoke, dialogs (30+ tests)
- UserInvitationsList: Accept, decline, expiration (35+ tests)

**Test Categories:**
- Display and rendering
- User interactions
- API integration
- Loading/error states
- Accessibility
- Edge cases
- Props handling

## Known Limitations

- Email notifications not yet implemented
- No invitation message/comment field
- Expiration cleanup is manual (should be cron job)
- Cannot invite users not yet in system
- No way to customize invitation text
- No invitation preference settings for users

## Future Enhancements

1. **Email Notifications:** Send email when user invited
2. **Invitation Messages:** Admin can add message to invitation
3. **Auto-Expiry Cleanup:** Cron job to delete expired invitations
4. **Resend Invitations:** Resend expired invitations
5. **Bulk Operations:** Bulk accept/decline invitations
6. **Notification Preferences:** Users can control invitation settings
7. **Invitation History:** Track accepted/declined invitations
8. **Invitation Templates:** Pre-made invitation messages
9. **Rate Limiting:** Limit invites per admin per hour
10. **Analytics:** Track invitation acceptance rates

## Related Stories

- **2-1:** Create Group
- **2-2:** View Groups List
- **2-3:** View Group Details (admin settings integration)
- **2-4:** Join Group via Invite
- **2-6:** Remove Members from Group
- **2-7:** Update Group Settings

## Architecture Notes

- **Server-Only Database:** Queries in lib/db/ not imported by client
- **Service Layer:** Abstracts API calls from components
- **Structured Responses:** Consistent error handling across all endpoints
- **Validation:** Both client and server-side validation
- **Authentication:** All endpoints require x-user-id header
- **Authorization:** Admin checks at API level
- **Database Constraints:** Unique constraint prevents duplicates
- **Cascade Deletion:** Maintains referential integrity

## Build Status

✅ **All TypeScript strict mode compliance**
✅ **Zero build errors**
✅ **All test files compile**
✅ **165+ total test cases**

---

**Spec Created:** 2026-03-02
**Implementation Complete:** 2026-03-02
**Status:** Ready for Code Review
**Story ID:** 2-5
**Epic:** Epic 2 - Group Management
