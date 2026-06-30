---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-02-update-epics-for-prd-2026-06-30
  - step-03-create-stories
inputDocuments:
  - "prd.md (Product Requirements Document — updated 2026-06-30 with FR59-FR70, NFR30-NFR32)"
  - "architecture.md (Architecture Decision Document with Next.js starter)"
  - "ux-design-specification.md (UX Design Specification with Chakra UI)"
workflowType: create-epics-and-stories
project_name: get-together
user_name: Andrewramell
date: 2026-06-30
status: stories-complete
---

# get-together - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for get-together, decomposing the requirements from the PRD, Architecture, and UX Design into implementable stories.

## Requirements Inventory

### Functional Requirements (70 total)

**User Management & Authentication (5):** FR1-FR5  
**Group Management (10):** FR6-FR15  
**Social Circles (7):** FR64-FR70  
**Availability & Soft Calendar (7):** FR16-FR22  
**Event Proposal & RSVP (12):** FR23-FR34  
**Wishlist & Discovery (8):** FR35-FR42  
**Comments & Discussion (6):** FR43-FR48  
**Real-Time Synchronization (3):** FR49-FR51  
**Web & Responsive Design (3):** FR52-FR54  
**Data Security & Privacy (4):** FR55-FR58  
**SMS Magic Link Authentication (5):** FR59-FR63

### Non-Functional Requirements (32 total)

**Performance (8):** NFR1-NFR8 — <500ms event creation, <1s sync, <2s page load  
**Security (8):** NFR9-NFR16 — HTTPS/TLS, bcrypt, token management, privacy  
**Scalability (7):** NFR17-NFR23 — 1K+ concurrent users, auto-scaling  
**Accessibility (6):** NFR24-NFR29 — WCAG 2.1 Level AA, keyboard accessible  
**SMS Delivery & Security (3):** NFR30-NFR32 — SMS delivery SLA, link expiry, phone number handling

### Additional Requirements

- **Architecture:** Next.js starter, AppSync/Cognito, Aurora Postgres, AWS Amplify
- **Tech Stack:** React (web) + React Native/Expo (mobile), real-time subscriptions
- **UX/Design:** Mobile-first, Chakra UI, responsive, accessibility-first

---

## Epic List

### Epic 1: Authentication & User Profiles

Users can register, log in, manage profiles, and maintain secure sessions.

**User Outcome:** Secure identity and personalization foundation for all app features.

**FRs covered:** FR1, FR2, FR3, FR4, FR5

**Technical Considerations:**
- AWS Cognito for authentication (stateless, 24-hour token TTL)
- User profiles with name, avatar, email
- Password reset via email
- Secure session management
- HTTPS/TLS encryption
- Bcrypt password hashing

---

### Epic 9: SMS Magic Link Authentication

Users can receive a one-time SMS link to join groups or events and get an auto-created account with a single tap — no signup form required.

**User Outcome:** Zero-friction onboarding for new invitees; phone-as-identity eliminates registration barriers and accelerates group formation.

**FRs covered:** FR59, FR60, FR61, FR62, FR63

**NFRs covered:** NFR30, NFR31, NFR32

**Technical Considerations:**
- SMS provider integration (e.g., Twilio or AWS SNS SMS) for magic link delivery
- One-time token generation with 15-minute TTL and single-use invalidation
- Auto account creation tied to phone number (E.164 validated)
- Token must be consumed atomically (no replay attacks)
- Immediate access to target group/event on link click (no redirect to signup form)
- Re-request flow for expired/used links (new token within 30s guarantee)
- Phone numbers never stored in logs, never exposed to third parties

---

### Epic 10: Social Circles

Users can create named, reusable contact lists (social circles) and bulk-invite entire circles when creating groups or events.

**User Outcome:** Group setup time drops from minutes to seconds; recurring friend groups don't need to be re-assembled from scratch each time.

**FRs covered:** FR64, FR65, FR66, FR67, FR68, FR69, FR70

**Technical Considerations:**
- Social circle data model: named lists of contacts (phone or username) owned by a user, independent of any group/event
- CRUD operations on circles from profile settings
- Bulk invite: on group/event creation, selecting a circle enqueues SMS invites for all circle members
- Circles persist across group deletions (not group-scoped)
- Integration with Epic 9 (SMS magic links) for bulk invitations via phone number

---

### Epic 2: Group Creation & Management

Users can create groups, invite members via unique links, and manage group membership with admin controls.

**User Outcome:** Persistent group identity where users coordinate planning with their communities.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

**Technical Considerations:**
- Group CRUD operations with creator → admin role
- Cryptographically secure invite code generation
- Group member list and role management
- Admin-only member removal and group deletion
- Soft delete pattern (deleted_at column)
- Authorization checks on all group operations

---

### Epic 3: Soft Calendar & Availability

Users can mark their availability (free/busy) and view group members' availability in a shared soft calendar.

**User Outcome:** Real-time visibility into group availability without exposing private calendar details.

**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22

**Technical Considerations:**
- Manual availability marking (free/busy blocks with start/end times)
- Group soft calendar view with all members' availability
- Optimistic locking for concurrent updates
- Privacy: never store raw event details, only free/busy blocks
- Phase 2: Native calendar sync (Google, Apple, Outlook)
- Real-time updates via AppSync subscriptions

---

### Epic 4: Event Proposals & RSVP with Real-Time Momentum

Users can propose events, set optional commitment thresholds, track RSVPs (in/maybe/out), and see real-time momentum updates.

**User Outcome:** Fast group decision-making with visible, real-time commitment momentum that accelerates decisions.

**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34

**Technical Considerations:**
- Event creation with title, description, date range, optional threshold
- RSVP status tracking (in/maybe/out) with optimistic updates
- Real-time momentum counter ("5 in, 2 maybe, 1 out")
- Automatic event confirmation when threshold met
- Manual event status override (confirmed/cancelled)
- Event list view and event detail view
- Authorization: creators can delete/cancel; all members can RSVP
- <1 second sync requirement for RSVP updates

---

### Epic 5: Wishlists & Discovery

Users can add items to group wishlists, signal interest, and convert wishlist items into events.

**User Outcome:** Persistent inspiration and idea discovery between events; wishlists become group memory.

**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42

**Technical Considerations:**
- Wishlist item creation with title, description, optional URL/link
- Interest signals (mark interested/not interested)
- Interest count per item
- Wishlist item removal (only by creator)
- Convert wishlist item → event proposal
- Phase 1b: Share-sheet integration (native iOS/Android sharing from Safari, Instagram, etc.)

---

### Epic 6: Comments & Real-Time Discussion

Users can add, edit, and delete comments on events and wishlist items with real-time visibility to all group members.

**User Outcome:** Lightweight logistics discussion in one place, replacing fragmented group chat.

**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48

**Technical Considerations:**
- Comments on events and wishlist items
- Edit own comments (updates timestamp)
- Delete own comments
- Real-time comment propagation (<1 second)
- Authorization: all group members can comment; only comment author can edit/delete
- Comment count display on events/wishlist items

---

### Epic 7: Real-Time Synchronization & Data Consistency

System maintains sub-second real-time updates for all changes across all group members with data consistency guarantees.

**User Outcome:** Instant visibility of group decisions and updates without page refresh or polling.

**FRs covered:** FR49, FR50, FR51

**NFRs covered:** NFR1-NFR8 (Performance), NFR17-NFR20 (Scalability)

**Technical Considerations:**
- AppSync subscriptions for real-time RSVP, comment, wishlist updates
- <1 second propagation to all group members
- Optimistic locking for concurrent updates (no data loss)
- CRDT patterns for conflict-free updates if needed
- Real-time momentum counter updates (no batching)
- Data consistency under concurrent writes
- Handles 500+ RSVP changes per minute at scale

---

### Epic 8: Responsive Web App & Accessibility

Web app is fully responsive, keyboard accessible, meets WCAG 2.1 Level AA standards, and secures all data.

**User Outcome:** Accessible, inclusive experience for all users on desktop, tablet, and mobile browsers.

**FRs covered:** FR52, FR53, FR54, FR55, FR56, FR57, FR58

**NFRs covered:** NFR24-NFR29 (Accessibility), NFR9-NFR16 (Security)

**Technical Considerations:**
- Next.js React SPA with responsive design (mobile-first)
- Chakra UI components with accessibility built-in
- WCAG 2.1 Level AA compliance
- Keyboard navigation (Tab, Enter, Esc) on all elements
- Focus indicators (2px blue outline, 3px offset)
- Skip links for keyboard users ("Skip to main content")
- Semantic HTML and ARIA labels
- Color + icons for status distinction (never color alone)
- Touch targets minimum 48×48px
- Screen reader compatible
- Responsive breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- HTTPS/TLS encryption for all data
- Bcrypt password hashing
- Stateless 24-hour token TTL
- GDPR/CCPA compliance
- Public event link access (non-authenticated)

---

## Requirements Coverage Map

### FR Coverage by Epic

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Users can sign up with email and password |
| FR2 | Epic 1 | Users can log in with email and password |
| FR3 | Epic 1 | Users can reset forgotten passwords via email |
| FR4 | Epic 1 | Users can view and edit their profile |
| FR5 | Epic 1 | Users can log out and clear their session |
| FR6 | Epic 2 | Users can create a new group |
| FR7 | Epic 2 | Users can view a group they're a member of |
| FR8 | Epic 2 | Users can view all groups they belong to |
| FR9 | Epic 2 | Group creators automatically become group admins |
| FR10 | Epic 2 | Users can join a group via unique invite link |
| FR11 | Epic 2 | Group admins can invite new members via shareable link |
| FR12 | Epic 2 | Group admins can remove group members |
| FR13 | Epic 2 | Group admins can view list of all group members |
| FR14 | Epic 2 | Group admins can delete a group |
| FR15 | Epic 2 | Users can set notification preferences per group [Phase 2] |
| FR16 | Epic 3 | Users can view the soft calendar for their group |
| FR17 | Epic 3 | Users can manually mark their availability as free |
| FR18 | Epic 3 | Users can manually mark their availability as busy |
| FR19 | Epic 3 | Users can update or remove their availability entries |
| FR20 | Epic 3 | All group members can see each other's availability |
| FR21 | Epic 3 | Users can read their native calendar [Phase 1b] |
| FR22 | Epic 3 | System automatically syncs native calendar availability [Phase 1b] |
| FR23 | Epic 4 | Users can create an event proposal |
| FR24 | Epic 4 | Users can set an optional commitment threshold |
| FR25 | Epic 4 | Users can set an optional RSVP deadline |
| FR26 | Epic 4 | All group members can view pending event proposals |
| FR27 | Epic 4 | Users can mark their RSVP status |
| FR28 | Epic 4 | Users can change their RSVP status anytime |
| FR29 | Epic 4 | All group members see real-time RSVP count updates |
| FR30 | Epic 4 | Users can see who marked which RSVP status |
| FR31 | Epic 4 | Event automatically moves to "confirmed" when threshold met |
| FR32 | Epic 4 | Event creators can manually mark event as confirmed or cancelled |
| FR33 | Epic 4 | Users can view confirmed events in a list/calendar view |
| FR34 | Epic 4 | Event creators can delete/cancel an event proposal |
| FR35 | Epic 5 | Users can add items to the group wishlist |
| FR36 | Epic 5 | Users can optionally add a URL/link when adding to wishlist |
| FR37 | Epic 5 | Users can view the group wishlist |
| FR38 | Epic 5 | Users can react to wishlist items (mark "interested") |
| FR39 | Epic 5 | Users can see how many people marked interest on a wishlist item |
| FR40 | Epic 5 | Users can remove their own wishlist items |
| FR41 | Epic 5 | Users can convert a wishlist item into an event proposal |
| FR42 | Epic 5 | Users can share content to group wishlist via share-sheet [Phase 1b] |
| FR43 | Epic 6 | Users can add comments to event proposals |
| FR44 | Epic 6 | Users can add comments to wishlist items |
| FR45 | Epic 6 | Users can view all comments on an event or wishlist item |
| FR46 | Epic 6 | Users can edit their own comments |
| FR47 | Epic 6 | Users can delete their own comments |
| FR48 | Epic 6 | Comments appear in real-time to all group members |
| FR49 | Epic 7 | All real-time changes propagate to all group members instantly |
| FR50 | Epic 7 | Users see real-time updates without refreshing the page |
| FR51 | Epic 7 | System maintains data consistency across concurrent updates |
| FR52 | Epic 8 | Users can access the app via web browser |
| FR53 | Epic 8 | Web interface is responsive and usable on mobile browsers |
| FR54 | Epic 8 | Non-logged-in users can view and RSVP to events via public link |
| FR55 | Epic 8 | User passwords are encrypted and never stored in plaintext |
| FR56 | Epic 8 | All data is encrypted in transit (HTTPS/TLS) |
| FR57 | Epic 8 | User authentication tokens are secure and not exposed |
| FR58 | Epic 8 | The system complies with GDPR/CCPA data privacy requirements |
| FR59 | Epic 9 | Users can sign up and log in via SMS magic link using their phone number |
| FR60 | Epic 9 | Users invited via phone number receive a one-time access link via SMS |
| FR61 | Epic 9 | First-time users clicking SMS magic link get auto-created account, no registration steps |
| FR62 | Epic 9 | SMS magic link grants immediate access to group/event without requiring profile completion |
| FR63 | Epic 9 | Expired or already-used magic links display re-request prompt; new link delivered within 30 seconds |
| FR64 | Epic 10 | Users can create a named social circle as a global, reusable contact list |
| FR65 | Epic 10 | Users can add contacts to a social circle by phone number or app username |
| FR66 | Epic 10 | Users can remove contacts from a social circle |
| FR67 | Epic 10 | Users can view and manage all their social circles from their profile |
| FR68 | Epic 10 | Users can select a social circle when creating a group, bulk-adding all circle members as invitees |
| FR69 | Epic 10 | Users can select a social circle when creating an event, bulk-adding all circle members as invitees |
| FR70 | Epic 10 | Social circles persist independently of any group or event and are reusable across contexts |

### NFR Coverage by Epic

| NFR | Epic | Category | Description |
|-----|------|----------|-------------|
| NFR1-NFR8 | Epic 7 | Performance | <500ms event creation, <1s sync, <2s page load, no data loss |
| NFR9-NFR16 | Epic 8 | Security | HTTPS/TLS, encryption, bcrypt, token management, privacy |
| NFR17-NFR20 | Epic 7 | Scalability | 1K+ concurrent users, auto-scaling, high throughput |
| NFR24-NFR29 | Epic 8 | Accessibility | WCAG AA, keyboard accessible, semantic HTML, ARIA |
| NFR30-NFR32 | Epic 9 | SMS Delivery & Security | <30s delivery SLA, single-use links, E.164 validation |

---

## Epic Implementation Order

**Recommended sequence for MVP delivery:**

1. **Epic 1** — Authentication & Profiles (foundation)
2. **Epic 9** — SMS Magic Link Authentication (complements Epic 1; enables phone-based onboarding)
3. **Epic 10** — Social Circles (enables bulk invite in Epic 2)
4. **Epic 2** — Group Management (enable group creation)
5. **Epic 3** — Soft Calendar & Availability (enable visibility)
6. **Epic 4** — Event Proposals & RSVP (core value proposition)
7. **Epic 5** — Wishlists & Discovery (secondary value)
8. **Epic 6** — Comments & Discussion (enhance planning)
9. **Epic 7** — Real-Time Sync (enable all features)
10. **Epic 8** — Responsive Web & Accessibility (launch-ready)

Each epic delivers user value independently while enabling future epics.

---

**Status:** ✅ Epics approved (updated 2026-06-30 to add Epics 9 & 10 for PRD additions FR59-FR70, NFR30-NFR32) — ready for story creation


