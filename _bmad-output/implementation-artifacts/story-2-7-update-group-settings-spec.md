# Story 2-7: Update Group Settings - Specification

**Epic:** 2 - Group Management
**Status:** Specification Complete
**Date:** 2026-03-03

---

## User Story

**As a** group admin
**I want to** update group settings (name, description)
**So that** I can keep group information current and accurate

---

## Narrative

Admins can edit group metadata including name and description. Changes are reflected immediately across the application. Group settings are accessible from the group details page in an admin panel.

---

## Acceptance Criteria

### Update Settings
- [ ] Admin can access settings form from group details page
- [ ] Admin can edit group name (max 100 chars)
- [ ] Admin can edit description (max 500 chars)
- [ ] Real-time character count for description
- [ ] Validation shows errors before submission
- [ ] Submit button disabled on invalid input
- [ ] Submit button disabled while saving
- [ ] Toast notification on success/error
- [ ] Changes saved to database immediately
- [ ] Page updates to reflect changes

### Restrictions
- [ ] Only group admin can update settings
- [ ] Non-admins cannot access settings
- [ ] Cannot make group name empty
- [ ] Cannot exceed character limits

### Data Integrity
- [ ] Trimmed whitespace on save
- [ ] No partial updates (all or nothing)
- [ ] Concurrent updates handled properly
- [ ] Updated_at timestamp updated

---

## Technical Specification

### API Endpoints

#### PATCH /api/groups/{groupId}
```
PATCH /api/groups/{groupId}

Headers:
  x-user-id: {userId}
  Content-Type: application/json

Body:
{
  "name": "New Group Name",
  "description": "New description"
}

Response (200 OK):
{
  "success": true,
  "message": "Group updated",
  "group": {
    "id": "uuid",
    "name": "New Group Name",
    "description": "...",
    "created_by": "uuid",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}

Error (400 - Validation):
{
  "success": false,
  "error": "Group name is required",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "String must contain at least 1 character(s)"
    }
  ]
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
  "error": "Group not found",
  "errorCode": "GROUP_NOT_FOUND"
}
```

---

## Component Architecture

### Components
1. **GroupSettingsForm.tsx**
   - Edit form with name and description fields
   - Character counters
   - Real-time validation
   - Submit/Cancel buttons
   - Loading state
   - Error display

2. **GroupSettingsModal.tsx** (optional wrapper)
   - Modal to display settings form
   - Open/close handlers
   - Can be embedded in group details page

---

## Service Layer

### Client Services (lib/services/groupService.ts)
```typescript
updateGroupSettings(groupId: string, data: {
  name?: string;
  description?: string | null;
}): Promise<Response>
```

### Database Queries (lib/db/queries.ts)
```typescript
updateGroup(groupId, data) // Already exists, reuse
```

---

## Validation Rules

### Name
- Required
- Min: 1 character
- Max: 100 characters
- Trimmed before validation and save

### Description
- Optional
- Max: 500 characters
- Trimmed before save
- Can be null/empty

### Authorization
- Must be group admin to update
- Must own the group (created by current user) - optional requirement

---

## Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|-----------|---------|
| Name empty | 400 | VALIDATION_ERROR | Group name is required |
| Name too long | 400 | VALIDATION_ERROR | Name must be ≤100 characters |
| Description too long | 400 | VALIDATION_ERROR | Description must be ≤500 characters |
| Not group admin | 403 | NOT_GROUP_ADMIN | Not authorized |
| Group not found | 404 | GROUP_NOT_FOUND | Group not found |
| Not authenticated | 401 | NOT_AUTHENTICATED | Not authenticated |
| Server error | 500 | UPDATE_GROUP_FAILED | Failed to update group |

---

## UX Patterns

### Settings Modal Flow
1. Admin opens group details page
2. Admin clicks "Settings" or gear icon
3. Settings modal/form appears
4. Admin edits name and/or description
5. Character count updates in real-time
6. Validation errors show as user types
7. Submit button disabled if invalid
8. Admin clicks "Save"
9. Loading state shows on button
10. Toast notification appears
11. Modal closes on success
12. Group info updates on page
13. Or error toast shows and user can retry

### Inline Editing (Alternative)
1. Admin clicks "Edit" on group name/description
2. Fields become editable inline
3. Save/Cancel buttons appear
4. Editing immediately on page
5. Less disruption than modal

---

## Database Operations

### Update group
```sql
UPDATE groups
SET name = $2, description = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;
```

---

## Performance Considerations

- **Optimistic updates**: Update UI before API response (optional)
- **Debouncing**: Only validate on blur or final submission (not on every keystroke)
- **Caching**: Invalidate cache after update
- **Single update**: Combine name + description into one request

---

## Security Considerations

- **Authorization**: Verify admin role at API level
- **Authentication**: Check x-user-id header
- **Input validation**: Sanitize whitespace, check length
- **SQL injection**: Use parameterized queries
- **XSS prevention**: React escapes by default

---

## Dependencies

- react (hooks: useState, useCallback)
- next/navigation (useRouter)
- @chakra-ui/react (Form, Input, Textarea, Modal, etc.)
- zod (validation schema)
- @/lib/services/groupService
- @/lib/contexts/AuthContext

---

## Future Enhancements

1. **Cover Image**: Add/change group cover photo
2. **Category Tags**: Assign group to categories
3. **Color Scheme**: Custom group colors/branding
4. **Invite Settings**: Control who can invite (admin/all)
5. **Privacy Settings**: Public/private group
6. **Archive Group**: Soft delete without removing data
7. **Theme**: Light/dark mode per group
8. **Auto-Archive**: Auto-archive inactive groups
9. **Settings History**: Track who changed what
10. **Rollback**: Undo recent setting changes

---

## Known Limitations

- No image upload yet
- No privacy controls yet
- No category/tags yet
- Cannot change group creator
- No version history
- No rollback capability

---

## Related Stories

- **2-1**: Create Group - initial name/description
- **2-3**: View Group Details - settings access point
- **2-6**: Remove Members - both in admin section
- **2-9**: Delete Group - both in settings/admin

---

## Testing Strategy

### Unit Tests
- Validation schema tests
- Service function tests
- Form validation tests

### Integration Tests
- Update group settings flow
- Permission checks
- Character limit enforcement
- Validation error display

### E2E Tests
- Admin updates group name
- Admin updates description
- Admin updates both
- Non-admin cannot update
- Changes reflected in group list
- Character limits enforced

---

## Acceptance Criteria Checklist

- [ ] Settings form displays for admins
- [ ] Name field editable (max 100 chars)
- [ ] Description field editable (max 500 chars)
- [ ] Real-time character counter
- [ ] Real-time validation
- [ ] Submit button disabled on invalid
- [ ] Only admins can access
- [ ] API call on submit
- [ ] Toast notification on success/error
- [ ] Changes saved to database
- [ ] Page updates after save
- [ ] Modal/form closes on success
- [ ] Error handling for all edge cases
- [ ] TypeScript strict mode compliance
- [ ] Chakra UI accessibility standards
- [ ] Comprehensive test coverage

---

**Spec Created:** 2026-03-03
**Status:** Ready for Implementation
**Story ID:** 2-7
**Epic:** Epic 2 - Group Management
