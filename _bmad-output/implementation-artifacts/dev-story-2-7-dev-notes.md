# Story 2-7: Update Group Settings - Dev Notes

**Narrative:** As a group admin, I want to update group settings (name, description), so that I can keep group information current and accurate.

**Status:** Complete - All Core Features ✅

## Implementation Summary

### API Endpoint

#### PATCH /api/groups/{groupId}
**Purpose:** Update group name and/or description
- **Body:** { name?: string, description?: string | null }
- **Auth:** Required (admin only)
- **Response:** Updated group object with timestamp
- **Validation:**
  - Name: required, 1-100 characters, trimmed
  - Description: optional, max 500 characters, trimmed
  - At least one field must be provided
- **Error Codes:** VALIDATION_ERROR, NOT_GROUP_ADMIN, GROUP_NOT_FOUND, UPDATE_GROUP_FAILED

**Reused Existing Code:**
- `updateGroup()` database function (already existed in lib/db/queries.ts)
- No new database modifications needed

### Component

#### GroupSettingsForm (250 lines)
**Location:** components/groups/GroupSettingsForm.tsx
- **Props:** groupId, initialName, initialDescription, onSuccess, onCancel
- **Features:**
  - Text input for name with max 100 chars
  - Textarea for description with max 500 chars
  - Real-time character counters
  - Real-time form validation
  - Trim whitespace on submit
  - Submit button disabled on invalid or unchanged data
  - Cancel button to discard changes
  - Toast notifications for success/error
  - Loading state during submission
  - Error messages below each field
- **State:** name, description, loading, errors
- **Validation:** Client-side validation + server-side validation

### Service Layer

**File:** lib/services/groupService.ts (1 new function)

**Client Function:**
- `updateGroupSettings(groupId, data)` - Call PATCH endpoint with name/description

Follows structured response pattern:
```typescript
{
  success: boolean;
  message?: string;
  group?: any;
  error?: string;
  errorCode?: string;
}
```

### Features Implemented

**Settings Updates:**
- ✅ Update group name (max 100 chars)
- ✅ Update group description (max 500 chars)
- ✅ Update both simultaneously
- ✅ Trim whitespace on save
- ✅ Allow null/empty description

**Validation:**
- ✅ Client-side real-time validation
- ✅ Server-side validation before save
- ✅ Character count display (name: X/100, description: X/500)
- ✅ Error messages below fields
- ✅ Prevent empty name
- ✅ Prevent submission with errors

**UX:**
- ✅ Toast notifications for success/error
- ✅ Submit button disabled on invalid/unchanged
- ✅ Loading state during submission
- ✅ Cancel button to discard changes
- ✅ Form field labels

**Security:**
- ✅ Admin-only operations
- ✅ Input validation (length, type)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React escaping)

### Files Created/Modified

**API:**
- Modified `app/api/groups/[groupId]/route.ts` - Added PATCH handler

**Components:**
- Created `components/groups/GroupSettingsForm.tsx`

**Service Layer:**
- Modified `lib/services/groupService.ts` - Added 1 function

**Tests:**
- Created `__tests__/api/group-settings.test.ts` (40+ test cases)
- Created `__tests__/components/groups/GroupSettingsForm.test.tsx` (45+ test cases)

**Documentation:**
- Created `_bmad-output/implementation-artifacts/story-2-7-update-group-settings-spec.md`
- Created `_bmad-output/implementation-artifacts/dev-story-2-7-dev-notes.md`

## Technical Decisions

1. **PATCH vs PUT:** Used PATCH for partial updates (can update just name or just description)
2. **Real-time Validation:** Client validates as user types for instant feedback
3. **Whitespace Trimming:** Both client and server trim input to prevent leading/trailing spaces
4. **Character Counters:** Real-time display helps users understand limits
5. **Save Button Disabled:** Only enabled when form is valid AND has changes
6. **Toast Notifications:** Immediate feedback without page reload

## Performance Considerations

- **Single API Call:** One PATCH request for all changes
- **Client Validation:** Instant validation without API call
- **Character Counting:** Lightweight operation on input
- **Memoization:** Could optimize with useMemo for validation logic

## UX Patterns

**Settings Flow:**
1. Admin opens group settings form
2. Admin edits name and/or description
3. Character counters update in real-time
4. Validation errors show as user types
5. Save button disabled if invalid or no changes
6. Admin clicks Save
7. Loading spinner shows on button
8. Toast notification appears
9. Form closes or shows error
10. Group info updates across app (parent component handles)

## Error Handling

| Scenario | HTTP Status | Error Code |
|----------|-------------|-----------|
| Name empty | 400 | VALIDATION_ERROR |
| Name > 100 chars | 400 | VALIDATION_ERROR |
| Description > 500 chars | 400 | VALIDATION_ERROR |
| Not group admin | 403 | NOT_GROUP_ADMIN |
| Group not found | 404 | GROUP_NOT_FOUND |
| No fields provided | 400 | VALIDATION_ERROR |
| Not authenticated | 401 | NOT_AUTHENTICATED |
| Server error | 500 | INTERNAL_ERROR |

## Testing Coverage

**API Tests (40+ cases):**
- Name validation
- Description validation
- Admin verification
- Character limit enforcement
- Whitespace trimming
- Timestamp updates
- Error handling
- Edge cases

**Component Tests (45+ cases):**
- Form display
- Input handling
- Validation display
- Form submission
- Toast notifications
- Error handling
- Accessibility
- Props handling

**Test Categories:**
- Display and rendering
- Form validation
- User interactions
- API integration
- Loading/error states
- Accessibility
- Edge cases

## Known Limitations

- No image/avatar upload
- No category tags
- No privacy controls
- Cannot change creator
- No version history
- No rollback

## Future Enhancements

1. **Cover Image:** Add/change group cover photo
2. **Categories:** Tag group with categories
3. **Privacy Settings:** Public/private group
4. **Color Scheme:** Custom group colors
5. **Activity Feed:** Show recent changes
6. **Permissions:** Control who can edit
7. **Auto-Archive:** Archive inactive groups
8. **Settings History:** Track changes
9. **Rollback:** Undo recent changes
10. **Bulk Updates:** Update multiple groups

## Related Stories

- **2-3:** View Group Details - settings integration point
- **2-6:** Remove Members - admin section
- **2-9:** Delete Group - admin section

## Architecture Notes

- **API Handler:** PATCH endpoint uses existing updateGroup query function
- **Service Layer:** Abstraction between components and API
- **Validation:** Zod schema with custom error handling
- **Error Handling:** Consistent pattern across all endpoints
- **Authorization:** Checked at API level before database operations
- **Database:** Reused existing updateGroup function

## Build Status

✅ **All TypeScript strict mode compliance**
✅ **Zero build errors**
✅ **85+ test cases for Story 2-7**
✅ **615+ total test cases across all stories**

## Integration Points

- Integrates with existing group management system
- Uses existing authentication context
- Uses existing database queries
- Follows established service/component patterns
- Compatible with group details page

---

**Spec Created:** 2026-03-03
**Implementation Complete:** 2026-03-03
**Status:** Ready for Code Review
**Story ID:** 2-7
**Epic:** Epic 2 - Group Management

## Summary Statistics

**API:**
- 1 PATCH endpoint
- Reused existing updateGroup database function
- Full error handling with status codes

**Components:**
- 1 component (250 lines)
- Full form validation
- Toast notifications
- Accessibility compliant

**Service:**
- 1 service function
- Consistent response format
- Error mapping

**Tests:**
- 85+ total test cases
- API endpoint coverage
- Component coverage
- Edge case coverage

**Documentation:**
- Comprehensive specification
- Implementation notes
- Architecture decisions
