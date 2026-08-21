---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments:
  - "Conversation context: Problem statement, solution concept, feature set, tech stack, complete data schema"
workflowType: prd
classification:
  projectType: mobile_app
  domain: general
  complexity: medium
  projectContext: greenfield
lastEdited: "2026-08-20"
editHistory:
  - date: "2026-06-30"
    changes: "Added Social Circles (FR64–FR70, global reusable friend lists), SMS magic link auth (FR59–FR63, supplements email/password), Journey 5 (First-Timer via SMS), NFR30–NFR32 (SMS delivery and security), updated Executive Summary, Product Scope, Success Criteria, and What Makes This Special"
  - date: "2026-08-20"
    changes: "Availability-first pivot per approved sprint-change-proposal-2026-08-19: reweighted Executive Summary/What Makes This Special/Innovation around availability-first discovery; pulled Google Calendar sync (OAuth, near-real-time) from Growth Features into MVP scope and FR21/FR22; added FR71 (per-group Planning Style setting); reframed the commitment-threshold success metric as Proposals-first-segment-specific and added an availability-engagement metric"
  - date: "2026-08-21"
    changes: "Added Plan Capture & Import Growth Feature: FR72–FR78 (share-sheet extended to any plan, paste-to-parse, email forwarding, SMS/MMS forwarding, AI-suggested detail review/accept, source attribution, per-plan capture dashboard); cross-referenced FR42 to FR72"
---

# Product Requirements Document - get-together

**Author:** Andrewramell
**Date:** 2026-02-27

## Executive Summary

Get-together solves group planning chaos by consolidating fragmented communication into a single source of truth. Currently, friend groups coordinate outings through group texts: ideas scatter, responses trickle in asynchronously, availability is unclear, and follow-ups are manual and repetitive.

Get-together eliminates this friction by providing:
- **Availability-first discovery** — a shared soft calendar showing each member's availability (free/busy only, preserving privacy), synced from Google Calendar, so groups see who's free before anyone has to propose anything
- **Persistent planning tools in one place** — event proposals, wishlists, checklists, photos, timeline, and logistics discussion, all attached to the group rather than scattered across texts
- **Event proposals** with real-time RSVP tracking and configurable commitment thresholds, with momentum visualization (e.g., "5 in, 2 maybe, 1 out") as a supporting signal — prominence is configurable per group
- **Group wishlists** for ongoing inspiration that persists between events
- **Social circles** — global, reusable friend lists added wholesale to any new group or event
- **SMS magic link onboarding** — invitees receive a text, click once, and join with an auto-created account; no signup form required

Target audience: groups of 10-15 people (friend groups, families, sports teams, clubs).

## What Makes This Special

Get-together operates at the intersection of five user needs:

1. **Availability** — Seeing who's actually free, synced from real calendars, removes the upstream friction that stops people from proposing anything in the first place
2. **Memory** — Shared wishlist captures ideas before they die in group chats or individual heads
3. **Discovery** — Cross-pollination surfaces plans no single person would propose
4. **Alignment** — Single source of truth (availability, proposals, planning tools) eliminates manual follow-up and coordination overhead; real-time momentum mechanic remains available as a supporting signal for groups that want it
5. **Frictionless Entry** — SMS magic links eliminate signup friction; phone-as-identity means invitees become members with a single tap, no form required

No existing tool handles this gap well. Doodle polls dates; Google Calendar shares everything; Partiful plans single events. Get-together maintains persistent group identity with shared, synced availability as the front door, aspirational wishlists, and persistent planning tools in one place.

## Project Classification

- **Type:** Mobile app (React Native/Expo) with web companion
- **Domain:** Consumer social/coordination
- **Complexity:** Medium (real-time sync, multi-calendar integration, dual platforms)
- **Context:** Greenfield

## Success Criteria

### User Success

Users succeed when they plan an outing with their group and realize the entire process was effortless. This manifests in three key moments:

1. **Ease & Empowerment** — Proposing an event, seeing real-time availability and commitment status, and achieving group consensus without manual follow-up texts. Users feel empowered rather than burdened by coordination.

2. **Serendipitous Discovery** — Encountering a wishlist item they'd forgotten about, or discovering a friend's idea they wouldn't have thought of alone. This surfaces latent group interests and keeps the group engaged between active planning cycles.

3. **Seamless Capture** — Seeing something on social media (restaurant, event, activity), sharing directly to the group wishlist via share-sheet, and watching that idea convert into a real outing. The app becomes ambient in their daily life, not something they need to remember to open.

Emotional outcome: Users feel relieved (coordination is handled), connected (shared visibility), and empowered (their ideas matter and reach the group instantly).

### Business Success

The product succeeds when groups adopt it as their default planning tool and sustain engagement over time:

- **3-month success:** A cohort of friend groups (target: 50+ groups, 500+ users) are actively using get-together to plan events. At least one event proposed per group per month, with sustained weekly engagement in the app.
- **6-month success:** Retention of launch cohort remains strong (80%+ of groups still active). Organic word-of-mouth drives a second wave of groups joining.
- **12-month success:** The app has demonstrated sustainable retention (groups planning 1+ events per month), user growth through word-of-mouth, and sufficient engagement data to inform next-phase decisions (monetization, feature expansion, or fundraising).

### Technical Success

The platform successfully delivers real-time coordination without friction:

- **Real-time updates** — RSVP changes, availability updates, and wishlist additions propagate instantly across group members with <1 second latency.
- **Calendar integrations** — Google Calendar, Apple Calendar, and Outlook integrations read free/busy data accurately and keep soft calendar in sync.
- **Push notifications** — Members receive timely, non-intrusive notifications for new event proposals and commitment milestones (e.g., "threshold met, event is happening").
- **Cross-platform reliability** — iOS and Android apps handle offline states gracefully and sync when connectivity returns. Web companion provides a full-featured backup.
- **Data consistency** — No race conditions in RSVP voting, wishlist updates, or commitment thresholds. Groups always see authoritative state.

### Measurable Outcomes

- **User-level:** First event proposed within 7 days of signup; user engages with app at least weekly once in an active group.
- **Group-level:** Group plans at least 1 event per month; group retains 80%+ member engagement over 3 months.
- **Feature-level:** Within Proposals-first groups, 70%+ of events include at least 1 commitment threshold; 50%+ of active groups have 5+ wishlist items; average RSVP response time <24 hours.
- **Availability engagement:** 30%+ of event proposals are created directly from the availability-first home screen within 3 months of launch.
- **Technical-level:** 99% uptime; real-time sync latency <1 second; zero data loss events.
- **Social circles:** 40%+ of new groups created using a social circle within 3 months of launch.
- **SMS onboarding:** >80% of users invited via SMS magic link complete onboarding (join or RSVP) within 24 hours of receiving the link.

## Product Scope

### MVP - Minimum Viable Product

**Core Flow:**
- Persistent group creation with invite links; group membership management (admin/member roles)
- Soft calendar showing free/busy blocks per group member (manual availability marking, supplemented by Google Calendar sync)
- Event proposal workflow: create event with title/description/date range/optional commitment threshold; group members mark in/maybe/out; real-time RSVP display
- Wishlist: add items with optional links/images; group members react (interested/not interested); ability to convert wishlist items into events
- Basic comments on events and wishlist items
- Push notifications for new proposals and commitment milestones
- Social circles: users create global, named friend lists; add an entire circle when creating a new group or event (bulk invite)
- SMS magic link auth: invite contacts by phone number; recipients receive a text link; clicking auto-creates their account and grants immediate access (supplements email/password)
- Google Calendar sync: connect Google Calendar via OAuth; soft calendar automatically populated with free/busy blocks, refreshed on a near-real-time basis; availability-first home screen surfaces this alongside proposals

**Why this scope:** Proves the core value prop — availability-first group coordination, with momentum and planning tools as supporting mechanics — without unnecessary external dependencies. Google Calendar sync is pulled into MVP because upstream availability visibility is the primary friction point; Apple/Outlook sync and advanced planning tools can wait.

### Growth Features (Post-MVP)

- **Apple & Outlook calendar sync** — Extend calendar sync (Google is current-scope, see MVP) to Apple and Outlook calendars
- **Advanced planning tools** — Checklists with task assignment, shared notes/whiteboard, cost tracking and splitting
- **Share-sheet integration** — iOS and Android share extensions; share restaurants, events, activities directly from social media into group wishlists
- **Notification preferences** — Per-group notification settings; quiet hours; digest emails
- **Group history & analytics** — See past events and engagement trends; group statistics
- **Social features** — Group photos, event recaps, member profiles
- **Plan capture & import** — Paste-to-parse, email-forwarding, and SMS/MMS-forwarding capture of trip/plan details from group chats and email threads (FR72–FR78), surfaced on a per-plan dashboard with source attribution. Automatic ingestion is limited to email and SMS (both support inbound forwarding); group chat platforms (iMessage, WhatsApp) don't expose third-party read access, so capture there is share/paste-triggered, not passive sync.

### Vision (Future)

- **AI-powered suggestions** — Recommend events/activities based on group wishlist history and member interests
- **Integration ecosystem** — Connect to Ticketmaster, Airbnb, Yelp, Google Maps for event/activity data
- **Monetization options** — Premium group features (unlimited groups, advanced analytics); potential affiliate revenue from integrations
- **Community features** — Browse public wishlists, discover new activities, join groups based on interests
- **Real-world experiences** — Partner with local businesses for exclusive group deals

## User Journeys

### Journey 1: Alex - The Event Initiator (Success Path)

**Who:** Alex, 28, works in tech, part of a close friend group of 6-8 people. Loves planning outings but hates the coordination chaos.

**The Story:**
- **Opening:** Alex has an idea for a hiking trip next month but dreads the group text. She downloads get-together and creates a group with her core friends using a link.
- **Rising Action:** She proposes the hiking trip — sets a date range (flexible), adds a description, and sees instantly which friends are actually free. No "let me check my calendar and get back to you." Real-time visibility.
- **Climax:** Within 2 hours, 5 friends mark "in," 1 marks "maybe," and 1 is out. The momentum is real. Alex can see it building. At 5 people in, she decides it's happening and pushes it to her calendar.
- **Resolution:** The trip gets booked, logistics get discussed in the app comments, and everyone stays on the same page. Alex never had to send a single follow-up text.

**Emotional arc:** Excited → Anxious (will people care?) → Relieved (people are in) → Empowered (this was easy)

### Journey 2: Jordan - The Wishlist Discoverer (Variant Path)

**Who:** Jordan, 31, sees something interesting on Instagram — a new restaurant they didn't know about but love.

**The Story:**
- **Opening:** Jordan sees a cool restaurant on Instagram, hits the share button, selects "Get-Together," and chooses their friend group's wishlist (just a few taps).
- **Rising Action:** The restaurant lands in the group wishlist. That evening, another friend sees it and marks "interested." Then another. Within a day, there's momentum.
- **Climax:** A third friend says "I'm free next Thursday, let's go to that restaurant," and creates an event from the wishlist item. Now it's not abstract — it's happening.
- **Resolution:** The group decides, they go to the restaurant, and realize they never would have discovered it without the app surfacing everyone's ideas.

**Emotional arc:** Inspired → Curious (will others like it?) → Surprised (momentum builds) → Connected (we discovered this together)

### Journey 3: Taylor - The Group Admin (Operations Path)

**Who:** Taylor, 26, creates a friend group on get-together and needs to onboard people.

**The Story:**
- **Opening:** Taylor sets up a group called "Core Crew." She selects her "Close Friends" social circle — 7 pre-saved contacts — and adds the whole circle in one tap. Each member receives an SMS magic link invitation.
- **Rising Action:** 6 of 7 friends join within hours by clicking their text link. Taylor notices someone's name is off and removes them. She sets basic preferences for the group (notification settings).
- **Climax:** Once the group has 6+ active members, Taylor can see real-time engagement. People are marking availability, the first event proposal comes in, and the group feels alive.
- **Resolution:** Taylor realizes the group is self-sustaining. Her job is just to manage who's in and respond to edge cases.

**Emotional arc:** Hopeful (will this work?) → Vigilant (setting it up right) → Confident (it's working) → Hands-off (it runs itself)

### Journey 4: Casey - The Casual Member (Engagement Path)

**Who:** Casey, 29, joins a friend group but doesn't check the app daily. Works irregular shifts.

**The Story:**
- **Opening:** Casey joins a friend group but doesn't open get-together for a week. In that time, 3 events were proposed and discussions happened.
- **Rising Action:** Casey finally opens the app and sees a push notification from yesterday: "Sarah proposed 'Weekend Beach Trip' — see who's in." Casey opens it, sees the wishlist item "that beach house we talked about months ago," and realizes it's finally happening.
- **Climax:** Casey marks "in" and adds a comment offering to bring snacks. Real-time updates show everyone sees their commitment immediately.
- **Resolution:** Casey feels part of the group even though they don't check constantly. The app keeps them informed without spamming.

**Emotional arc:** Guilty (missed activity) → Engaged (there's momentum!) → Included (my commitment matters) → Connected (I'm still part of the group)

### Journey 5: Morgan — The First-Timer via SMS Link (Onboarding Path)

**Who:** Morgan, 27, is added to a friend group by Taylor. Has never used get-together before.

**The Story:**
- **Opening:** Morgan receives a text: "Taylor invited you to the Core Crew group — tap to join." No app download prompt, no signup form.
- **Rising Action:** Morgan taps the link. An account is created using Morgan's phone number. Morgan lands directly in the Core Crew group and sees a beach trip proposal with 4 people already in.
- **Climax:** Morgan marks "in" within 30 seconds of receiving the text. No password created, no profile form filled out — a single tap and an RSVP.
- **Resolution:** Morgan is now a full group member. Future group activity triggers SMS notifications. Setting up a display name or password is optional and deferred.

**Emotional arc:** Surprised (a text?) → Curious (what is this?) → Delighted (I'm already in!) → Engaged (I RSVPd in under a minute)

### Journey Requirements Summary

These journeys reveal the capabilities the product must deliver:

**Core Capabilities:**
- Group creation and management (create, invite via link, member roles, remove)
- Event proposal and lifecycle (create, propose date/description, threshold setting)
- Real-time RSVP tracking (in/maybe/out status, momentum display)
- Soft calendar showing member availability (manual marking initially)
- Wishlist item creation and interest signals
- Wishlist-to-event conversion (publish a wishlist item as an event)
- Comments on events and wishlist items
- Push notifications (smart, not spammy)
- Share-sheet integration (native iOS/Android sharing)
- Calendar sync (read Google/Apple/Outlook free/busy)
- Social circles: global friend lists reusable across groups and events
- SMS magic link auth: phone-as-identity, single-tap onboarding, account auto-creation

**User Experience:**
- Simple group onboarding (link-based joining; SMS magic link as primary path)
- Real-time updates (see RSVPs as they happen)
- Offline resilience (app works offline, syncs when connected)
- Non-intrusive notifications (only for key moments)
- Clear visual momentum (shows "5 in, 2 maybe, 1 out" at a glance)
- Zero-friction first-time experience (no form required to RSVP as a new user)

## Innovation & Competitive Positioning

**Core Innovation:** Soft calendar + persistent planning tools in one place creates a gap no existing tool fills. Doodle polls dates (asynchronous), Google Calendar shares everything (privacy loss), Partiful plans single events (no persistence). Get-together combines continuous, synced availability visibility as the front door, persistent group identity, aspirational wishlists, and configurable real-time momentum tracking into one coordinated loop.

**Technical Differentiator:** Real-time free/busy visibility (not event details) preserves privacy while enabling group coordination. The momentum mechanic ("5 in, 2 maybe, 1 out" live updates) accelerates decisions from async text threads.

### Validation & Risk

**Key validation metrics:**
- Soft calendar: Does real calendar sync (Phase 1b) work smoothly?
- Momentum mechanic: Do users notice real-time RSVP updates? Does it accelerate decisions?
- Wishlist: Do items convert to events at meaningful rates (>20%)?
- Adoption: Viral coefficient >1 via link sharing? High NPS?
- Engagement: Weekly active rate >60%? 1+ event/group/month?

**Innovation risk mitigations:**
- Soft calendar UX complexity: MVP uses manual marking only; calendar sync deferred to Phase 2
- Momentum mechanic flakiness: Show real-time status changes transparently; implement soft penalties for no-shows
- Wishlist decay: Allow admin curation; archive inactive items after 3 months
- Share-sheet complexity: MVP skips integration; Phase 2 adds iOS share target
- Privacy friction: Crystal-clear privacy policy; zero third-party data sharing

## Platform Requirements

**Web (MVP - Week 1):**
- React single-page application
- Responsive design for desktop, tablet, mobile browsers
- HTTPS/TLS encryption
- Cross-browser support (Chrome, Safari, Firefox, Edge)

**Mobile (Phase 1b - Weeks 2-3):**
- React Native/Expo (shared codebase, iOS 14+ and Android 10+)
- App Store and Google Play distribution
- Device permissions: Calendar (read-only), Contacts (optional), Push Notifications
- Network assumption: always-connected (no offline mode in MVP)

## Development Strategy

**Approach:** Problem-Validation MVP with ruthless scope discipline. Solo dev, 7-day timeline → web-only first (React), mobile second (React Native/Expo, weeks 2-3).

**Resource Model:** Solo full-stack developer leveraging managed services (Cognito, AppSync, Amplify) to eliminate infrastructure work. Backend logic reused between web and mobile.

**Phase 1a - Week 1 (Web MVP):**
- Groups (create, invite link, member management)
- Soft calendar (manual availability marking)
- Events (propose, RSVP in/maybe/out, momentum display)
- Wishlists (add items, react with interest)
- Comments (on events and wishlist items)
- Real-time sync (AppSync)
- Responsive web design

**Phase 1b - Weeks 2-3 (Mobile):**
- React Native/Expo app (iOS/Android)
- Native device access (calendar, contacts, push)
- Reuse all backend logic from web

**Phase 2+ (Growth features):**
- Calendar sync integration (Google, Apple, Outlook)
- Share-sheet integration (Instagram → wishlist)
- Push notifications (smart cadence)
- Checklists, cost splitting, group history

**Risk Mitigation:**
- Soft calendar UX complexity: Manual marking validates core loop before calendar sync
- One-week timeline: Web proves concept; mobile adds 2 weeks (reuses 90% backend logic)
- Scope creep: Frozen feature list for week 1; everything else deferred

## Functional Requirements

### User Management & Authentication

- **FR1:** Users can sign up with email and password
- **FR2:** Users can log in with email and password
- **FR3:** Users can reset forgotten passwords via email
- **FR4:** Users can view and edit their profile (name, avatar, email)
- **FR5:** Users can log out and clear their session
- **FR59:** Users can sign up and log in via SMS magic link using their phone number as an alternative to email/password authentication
- **FR60:** Users invited to a group or event via phone number receive a one-time access link via SMS
- **FR61:** First-time users clicking an SMS magic link have an account auto-created using their phone number as identity, with no additional registration steps required
- **FR62:** SMS magic link grants immediate access to the specific group or event without requiring profile completion
- **FR63:** Expired or already-used magic links display a re-request prompt; re-request delivers a new link within 30 seconds

### Group Management

- **FR6:** Users can create a new group with a name and optional description
- **FR7:** Users can view a group they're a member of
- **FR8:** Users can view all groups they belong to
- **FR9:** Group creators automatically become group admins
- **FR10:** Users can join a group via unique invite link (no email required)
- **FR11:** Group admins can invite new members via shareable link (users join by clicking)
- **FR12:** Group admins can remove group members
- **FR13:** Group admins can view list of all group members
- **FR14:** Group admins can delete a group
- **FR15:** Users can set notification preferences per group (enable/disable) [Phase 2]
- **FR71:** Group admins can set the group's default Planning Style (Availability-first or Proposals-first), which determines the group's default landing view

### Social Circles

- **FR64:** Users can create a named social circle as a global, reusable contact list independent of any group or event
- **FR65:** Users can add contacts to a social circle by phone number or app username
- **FR66:** Users can remove contacts from a social circle
- **FR67:** Users can view and manage all their social circles from their profile
- **FR68:** Users can select a social circle when creating a group, bulk-adding all circle members as invitees in a single action
- **FR69:** Users can select a social circle when creating an event, bulk-adding all circle members as invitees in a single action
- **FR70:** Social circles persist independently of any group or event and are reusable across multiple planning contexts

### Availability & Soft Calendar

- **FR16:** Users can view the soft calendar for their group showing all members' availability
- **FR17:** Users can manually mark their availability as free for specific time blocks
- **FR18:** Users can manually mark their availability as busy for specific time blocks
- **FR19:** Users can update or remove their availability entries
- **FR20:** All group members can see each other's availability (free/busy only, no event details)
- **FR21:** Users can connect their Google Calendar via OAuth to populate availability
- **FR22:** System syncs Google Calendar availability on a near-real-time basis

### Event Proposal & RSVP

- **FR23:** Users can create an event proposal with title, description, and date/date range
- **FR24:** Users can set an optional commitment threshold (minimum people needed for event to happen)
- **FR25:** Users can set an optional RSVP deadline for group
- **FR26:** All group members can view pending event proposals
- **FR27:** Users can mark their RSVP status: "in", "maybe", or "out"
- **FR28:** Users can change their RSVP status anytime
- **FR29:** All group members see real-time RSVP count updates (e.g., "5 in, 2 maybe, 1 out")
- **FR30:** Users can see who marked which RSVP status
- **FR31:** Event automatically moves to "confirmed" when threshold is met (if threshold is set)
- **FR32:** Event creators can manually mark event as confirmed or cancelled
- **FR33:** Users can view confirmed events in a list/calendar view
- **FR34:** Event creators can delete/cancel an event proposal

### Wishlist & Discovery

- **FR35:** Users can add items to the group wishlist with title and optional description
- **FR36:** Users can optionally add a URL/link when adding to wishlist
- **FR37:** Users can view the group wishlist
- **FR38:** Users can react to wishlist items (mark "interested")
- **FR39:** Users can see how many people marked interest on a wishlist item
- **FR40:** Users can remove their own wishlist items
- **FR41:** Users can convert a wishlist item into an event proposal
- **FR42:** Users can share content to group wishlist via share-sheet [Phase 1b] (see FR72 for share-sheet capture into plans generally, Growth Features)

### Comments & Discussion

- **FR43:** Users can add comments to event proposals
- **FR44:** Users can add comments to wishlist items
- **FR45:** Users can view all comments on an event or wishlist item
- **FR46:** Users can edit their own comments
- **FR47:** Users can delete their own comments
- **FR48:** Comments appear in real-time to all group members

### Plan Capture & Import

- **FR72:** Users can share text or links from any app into a specific group/event via native share-sheet
- **FR73:** Users can paste raw text (copied from a group chat or email thread) into a plan; the system parses it and suggests structured details (dates, locations, decisions, action items) for the plan
- **FR74:** Users can forward an email to a plan-specific email address; the system parses the email and attaches suggested structured details to the corresponding plan
- **FR75:** Users can review and accept or reject each AI-suggested detail before it's saved to the plan
- **FR76:** Each captured detail on a plan shows its source (e.g., "pasted from chat," "forwarded email," "forwarded text") for traceability
- **FR77:** Users can view a consolidated dashboard per plan showing all captured details (dates, locations, links, decisions) regardless of source
- **FR78:** Users can forward a text message or MMS screenshot to the app's phone number; the system parses it (with OCR for images) and suggests it for attachment to the user's most recently active plan, prompting for plan selection if ambiguous

### Real-Time Synchronization

- **FR49:** All real-time changes (RSVPs, comments, wishlist updates) propagate to all group members instantly (<1 second)
- **FR50:** Users see real-time updates without refreshing the page
- **FR51:** System maintains data consistency across concurrent updates

### Web & Responsive Design

- **FR52:** Users can access the app via web browser
- **FR53:** Web interface is responsive and usable on mobile browsers (tablets, phones, desktop)
- **FR54:** Non-logged-in users can view and RSVP to events via public link (web only, MVP)

### Data Security & Privacy

- **FR55:** User passwords are encrypted and never stored in plaintext
- **FR56:** All data is encrypted in transit (HTTPS/TLS)
- **FR57:** User authentication tokens are secure and not exposed to third parties
- **FR58:** The system complies with GDPR/CCPA data privacy requirements

## Non-Functional Requirements

### Performance

- **NFR1:** Event proposal creation completes within 500ms (user sees confirmation instantly)
- **NFR2:** RSVP status change propagates to all group members in <1 second via real-time sync
- **NFR3:** Wishlist item addition appears to all group members in <1 second
- **NFR4:** Comment submission and visibility to group in <1 second
- **NFR5:** Page load time for web app: <2 seconds on 4G connection (initial load), <500ms for subsequent navigations
- **NFR6:** Soft calendar view renders with all member availability within 1 second
- **NFR7:** Real-time momentum counter updates as each RSVP comes in (no batching or delays)
- **NFR8:** System handles concurrent RSVP updates from multiple users without losing or corrupting data
- **NFR30:** SMS magic links are delivered within 30 seconds of request for 95th percentile as measured by SMS provider delivery receipts

### Security

- **NFR9:** All user data transmitted over HTTPS/TLS (encrypted in transit)
- **NFR10:** Passwords hashed using bcrypt or equivalent (never stored in plaintext)
- **NFR11:** User authentication tokens are stateless, time-limited (expire after 24 hours), and invalidated on logout
- **NFR12:** Calendar data from external providers (Google, Apple, Outlook) never stored — only free/busy blocks cached, never event details
- **NFR13:** Group invitations are link-based and one-time consumable (can't be replayed)
- **NFR14:** User data encrypted at rest in database
- **NFR15:** No user email, calendar data, or personal information shared with third parties
- **NFR16:** System logs all data access and modifications for security audit trail (Phase 2)
- **NFR31:** SMS magic links are single-use and invalidated immediately upon first use; links unused after 15 minutes cannot be reused
- **NFR32:** Phone numbers used for SMS auth are validated to E.164 format before use and never logged or exposed to third parties

### Scalability

- **NFR17:** System architecture supports minimum 1,000 concurrent users
- **NFR18:** Database can handle 10,000+ groups with 10-15 members each
- **NFR19:** Real-time sync maintains <1 second latency even at 80% capacity
- **NFR20:** API can handle 100+ event proposals and 500+ RSVP changes per minute
- **NFR21:** Horizontal scalability: additional servers/instances can be added to handle 10x user growth without code changes
- **NFR22:** Database auto-scales to handle growth (if using serverless like Aurora Serverless)
- **NFR23:** Push notification queue handles 10,000+ notifications per hour without message loss

### Accessibility

- **NFR24:** Web interface meets WCAG 2.1 Level AA accessibility standards
- **NFR25:** All interactive elements (buttons, inputs, links) are keyboard accessible
- **NFR26:** Color is not the only way to distinguish availability status (e.g., use icons + color)
- **NFR27:** All images and icons have descriptive alt text
- **NFR28:** Forms have clear labels associated with input fields
- **NFR29:** Screen reader compatible: semantic HTML and ARIA labels where needed
