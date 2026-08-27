---
story_key: "2-8-planning-style-setting"
epic: "2"
story: "8"
title: "Per-Group Planning Style Setting"
status: "ready-for-dev"
created_date: "2026-08-27"
---

# Story 2.8: Per-Group Planning Style Setting

**Epic:** 2 - Group Creation & Management
**Story Key:** 2-8-planning-style-setting
**Created:** 2026-08-27
**Status:** ready-for-dev

---

## Story

As a group admin,
I want to set my group's default Planning Style (Availability-first or Proposals-first),
So that the group's landing view matches how that specific group actually likes to plan.

---

## Acceptance Criteria

**AC1: Default Value for New Groups**
- **Given** a new group is created
- **When** it's saved
- **Then** its `planning_style` defaults to `'availability-first'`

**AC2: Admin Can Change Setting**
- **Given** a group admin viewing group settings
- **When** they change the Planning Style toggle (Availability-first ↔ Proposals-first)
- **Then** the group's `planning_style` is updated
- **And** the change takes effect immediately for all members' next app open (no re-login required)

**AC3: Non-Admin Cannot Change Setting**
- **Given** a non-admin group member
- **When** they view group settings
- **Then** the Planning Style control is visible but read-only (shows current value, no edit control), consistent with other admin-only settings

**AC4: Setting Drives Default Landing View**
- **Given** a group's `planning_style` is set
- **When** any member of that group opens the app
- **Then** they land on the Availability view (Story 3.7) if `'availability-first'`, or the existing event feed if `'proposals-first'`

**AC5: Existing Groups Backfilled**
- **Given** groups that existed before this story shipped
- **When** the migration runs
- **Then** they are backfilled with `planning_style = 'availability-first'` (matching AC1's default, so existing groups get the new front door too, consistent with this being the product's new default rather than a breaking change for existing users who can switch back to Proposals-first if they prefer the original experience)

---

## Requirements Mapped

**Functional Requirements:**
- FR71: Group admins can set the group's default Planning Style (Availability-first or Proposals-first), which determines the group's default landing view

---

## Tasks / Subtasks

**Task 1: Database Migration**
- [ ] Add `planning_style` column to `groups` table: `VARCHAR`, `CHECK (planning_style IN ('availability-first', 'proposals-first'))`, `NOT NULL DEFAULT 'availability-first'`
- [ ] Migration backfills existing rows with the default (satisfied automatically by the `NOT NULL DEFAULT` clause — no separate backfill script needed)

**Task 2: API Endpoint**
- [ ] `PATCH /api/groups/:groupId/settings` (or extend existing group-settings endpoint if one exists from Epic 2) — accepts `planning_style`, validates admin role before applying (403 for non-admins), validates enum value (400 for invalid)

**Task 3: Settings UI**
- [ ] Add Planning Style toggle/radio control to group settings screen
- [ ] Admin: editable control
- [ ] Non-admin: read-only display of current value (AC3)
- [ ] Brief inline explanation of what each mode means (reuse language from PRD's Executive Summary / UX spec Section 2.1 framing)

**Task 4: Routing Integration**
- [ ] Wire the real `planning_style` value into Story 3.7's routing logic, replacing the interim hardcoded default noted in that story's Task 2

**Task 5: Testing**
- [ ] API tests: admin can update, non-admin gets 403, invalid value gets 400
- [ ] Migration test: existing groups backfilled correctly
- [ ] Component tests: toggle renders correctly for admin vs. non-admin
- [ ] Integration test: changing the setting changes which view a member lands on next open

---

## Dev Notes

### Architecture Context

- This is a small, self-contained story — one column, one settings control, one routing branch. It unblocks Story 3.7's interim workaround.
- Follows the existing admin-authorization pattern from other Epic 2 stories (role check via `group_memberships.role = 'admin'`).

### Project Structure Notes

- Update: `groups` table migration
- Update: existing group settings API route and UI component (from earlier Epic 2 stories) — extend rather than create new, if a settings endpoint/screen already exists
- Update: `3-7-availability-home-screen.md`'s routing logic (remove interim default once this ships)

### References

- [Source: prd.md#FR71](../planning-artifacts/prd.md)
- [Source: 3-7-availability-home-screen.md](./3-7-availability-home-screen.md) — Task 2's interim workaround this story replaces
- [Source: 2-1-create-group.md](./2-1-create-group.md) — existing groups table schema this migration extends

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following FR71 and the sprint-change-proposal-2026-08-19's Epic 2 candidate story

### Story Quality Checklist
- ✅ Explicit default and backfill behavior specified (AC1, AC5) — avoids leaving existing-vs-new-group behavior ambiguous
- ✅ Admin/non-admin authorization boundary specified (AC2, AC3)
- ✅ Explicit cross-reference to Story 3.7's interim workaround, with a concrete task to remove it

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** None blocking start; Story 3.7 benefits from this landing (removes its interim default)
- **Blocking Issues:** None

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation
3. **Follow-up:** Once this ships, revisit Story 3.7 to remove its temporary hardcoded default (Task 2 there)
