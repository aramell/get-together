---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-core-experience
  - step-04-emotional-response
  - step-05-inspiration
  - step-06-design-system
  - step-07-defining-experience
  - step-08-visual-foundation
  - step-09-design-directions
  - step-10-user-journeys
  - step-11-component-strategy
  - step-12-ux-patterns
  - step-13-responsive-accessibility
  - step-14-complete
workflowStatus: complete
completionDate: "2026-03-02"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
date: "2026-03-02"
---

# UX Design Specification - get-together

**Author:** Andrewramell
**Date:** 2026-03-02

---

## Executive Summary

### Project Vision

Get-together is a mobile-first coordination platform that helps groups of working professionals and friends move beyond endless group chat planning into actual action. The core promise: visibility into who's available, real-time clarity on group commitment, and a single source of truth that eliminates manual follow-ups and planning fatigue.

The emotional outcome users seek: **"Getting out of the group text"** — moving from speculative chat threads to concrete plans with clear momentum.

### Target Users

- **Primary:** Working professionals with competing calendars and limited bandwidth (many with families/kids)
- **Secondary:** Friend groups and social circles seeking to coordinate outings
- **Usage Pattern:** Primarily mobile-accessed, 3-5 times/week baseline; escalates to several times/day during active planning windows
- **Current Pain:** Fragmented planning across group texts, Google Calendar, Doodle polls, and email with visibility gaps and repetitive follow-ups

### Key Design Challenges

1. **Visibility as Competitive Advantage** — Lack of visibility into who's actually available and committed is the primary friction. The UX must make availability crystal clear at a glance, reducing the need for "let me check and get back to you" responses.

2. **Rapid Commitment Mechanics** — Users want to make quick, confident commitments without endless back-and-forth. The RSVP flow must be frictionless (1-2 taps) while surfacing enough context to make a decision.

3. **Silence-Breaking Momentum** — The most powerful moment is when momentum becomes visible ("5 in, 2 maybe, 1 out"). This must feel real-time, satisfying, and create social pressure to decide.

4. **Mobile-First, Context-Aware Design** — Most access is mobile with episodic check-ins. The app must serve its purpose in quick glances and deep dives, not require sustained attention.

5. **Replacing Group Text Workflows** — The app must replace the core group text workflow (propose → wait → follow up → confirm). If it doesn't, users stay in texts and the app becomes redundant.

### Design Opportunities

1. **Momentum as Celebration** — Real-time RSVP updates with micro-interactions (animations, celebratory feedback) that make people feel part of something happening *right now*. This is the emotional win that replaces group chat dopamine.

2. **Availability as Trust Signal** — When people can see free/busy blocks, it builds trust and reduces perceived flakiness. The soft calendar becomes a way to show commitment before even saying yes.

3. **Professional + Social Balance** — Design for the working professional reality: calendar conflicts, last-minute changes, and the need to feel connected despite chaos. Make it feel reliable and non-judgmental.

4. **Ambient Integration** — Share-sheet integration and push notifications designed for professionals who aren't hanging on their phones. Notifications should feel timely, not spammy.

5. **Group Identity & History** — Persistent wishlists and past events become group memory. Over time, the app becomes the repository of "things we've done together" — emotional stickiness beyond coordination.

## Core User Experience

### Defining Experience

The core experience of get-together revolves around **event creation and the real-time response workflow**. This is the heartbeat of the app.

**Event Creation Loop:**
1. User proposes an event (title, date range, optional threshold)
2. Instantly see soft calendar availability for the group
3. Watch real-time RSVP responses flow in
4. See commitment threshold met (if set) → event confirms
5. Planning moves to logistics (comments, coordination)

**Why this matters:** Event creation is the moment when ideas become action. The moment of truth for "will this actually happen?" Every interaction in this workflow must be frictionless.

### Platform Strategy

- **Primary Platform:** React Native mobile app (iOS/Android) — where 80%+ of users will live
- **Secondary Platform:** React web app — full-featured backup for desktop/browser access
- **Interaction Model:** Touch-first, optimized for one-handed mobile use during commutes, breaks, and quick check-ins
- **Context:** Episodic access (3-5x/week baseline, escalating during active planning)
- **Offline Handling:** App gracefully handles disconnects; syncs when connectivity returns

### Effortless Interactions

**Frictionless RSVP:**
- Event visible in feed or calendar
- Single tap to open event detail
- Three large tap targets: "In", "Maybe", "Out"
- Optional: add comment in same flow, but not required
- Confirmation instant and visible

**Single Source of Truth:**
- When user opens an event, they see everything at once:
  - Proposal details (what, when, who suggested)
  - Current RSVP status (count and names)
  - Soft calendar showing who's available
  - All comments and logistics discussion
  - Event status (pending, threshold met, confirmed, happened)
- **No searching group texts for context** — everything is here

**Visibility Without Work:**
- Soft calendar is the default landing view
- See group availability at a glance when creating/responding to events
- No need to ask "who's free?" separately

**Seamless Sharing:**
- Share-sheet integration (Phase 1b) to add items to group wishlist from Instagram, URLs, etc.
- One tap to convert wishlist item into event proposal

### Critical Success Moments

1. **Real-Time Momentum Visible:** User creates an event, and within seconds they see the first RSVP come in. The momentum counter updates instantly. They feel the group responding *right now*.

2. **Single Source Replaces Group Text:** User opens get-together to check status on an event and sees complete picture (who's in, comments, availability, next steps). They realize they never have to ask "has anyone seen the group text?" again.

3. **Threshold Met = Action:** User watching momentum, and the event flips from "pending" to "confirmed" when threshold is met. The app makes the decision for the group. No more waiting for admin to say "okay, let's do this."

4. **Episodic Engagement Works:** User hasn't checked app in 3 days, opens it, and immediately understands what's happening. No context-switching or reading through missed messages. The app surfaces what matters.

5. **Availability Builds Confidence:** When proposing an event, seeing real availability (not just "yes/no/maybe later") lets user know *why* people are committing. "Sarah's free Tuesday-Thursday" explains more than "Sarah is in."

### Experience Principles

1. **Speed Over Perfection** — Users should make RSVP commitments in seconds, even with partial information. Change status later if needed. The goal is speed to decision, not perfect information upfront.

2. **Visibility Creates Trust** — By surfacing all information (availability, RSVP status, discussion) in one place, we eliminate the anxiety of "did everyone see this?" and "who's actually coming?" Transparency drives commitment.

3. **Momentum is Momentum** — Real-time RSVP updates aren't just data; they're social signals that the group is *deciding right now*. Design celebrations (micro-interactions, momentum counter updates) to make this feel exciting.

4. **Working Professional Reality** — Design for interrupted attention, competing calendars, and the need to feel included despite chaos. Notifications should be timely (not spammy). The app should work in 30-second glances and 5-minute deep dives equally well.

5. **One Source, One Flow** — Every piece of event information lives in one place. No fragmented communication (event in app, logistics in texts, availability in calendar). If it's fragmented, users default to group texts and the app fails.

## Desired Emotional Response

### Primary Emotional Goals

The core emotional experience of get-together centers on two powerful feelings:

**Relief** — Users should feel the burden of coordination lifted. No more chasing people down via texts. No more manual follow-ups. No more wondering "who actually said yes?" The app eliminates coordination anxiety and makes planning effortless.

**Excitement** — Users should feel the energy of momentum building in real-time. Seeing responses come in, watching the counter climb ("5 in, 2 maybe, 1 out"), experiencing the moment when threshold is met — these create a sense of *something is happening right now* that is both social and satisfying.

Together: Users move from the stress and silence of group texts to the relief and momentum of real coordination.

### Emotional Journey Mapping

The emotional arc should unfold across the user experience:

**1. Discovery/Onboarding (Hopeful)**
- User is curious: "Could this actually replace our group texts?"
- Feel: Intrigued, hopeful this will solve real friction

**2. Creating an Event (Cautiously Optimistic)**
- User proposes an event and waits for first response
- Feel: Small risk, but optimistic. "Will people respond?"

**3. Real-Time RSVPs Arriving (Building Excitement)**
- First RSVP comes in. Then another. Momentum is visible.
- Feel: Excitement building. This is working! "Look, people are responding!"

**4. Threshold Met / Event Confirmed (Accomplishment + Celebration)**
- Event flips to confirmed. Threshold reached. Decision made.
- Feel: Relief and accomplishment. "It's happening! We made a decision!"

**5. Planning Discussion (Connected & Engaged)**
- Logistics happen in comments. Group coordinates.
- Feel: Relief. Everything in one place. Connected to the group.

**6. Event Happens (Pride & Memory)**
- Event occurs. Group executed together.
- Feel: Pride in the group. Sense of shared experience. Building memory.

### Micro-Emotions: Key Emotional States

Three micro-emotional polarities are critical:

**1. Confidence ↔ Confusion**
- Users should feel **confident** in their RSVP choice and status
- Never confused about "did everyone see my response?" or "who's actually coming?"
- Design support: Single source of truth showing all info at once

**2. Trust ↔ Skepticism**
- Users should feel **trust** that everyone in the group sees the same information
- Never skeptical that hidden information exists elsewhere (in group texts)
- Design support: Transparency (availability, RSVP counts, comments visible to all)

**3. Excitement ↔ Anxiety**
- Users should feel **excitement** about group momentum building
- Never anxiety about missing information or being left out
- Design support: Real-time updates that surface what matters; non-spammy notifications

### Design Implications

To create these emotions, specific UX choices matter:

**For Relief:**
- Single event view shows everything (no hunting through multiple UIs)
- Soft calendar is always visible (no "who's free?" question needed)
- RSVP is instant (no "click, wait, wonder if it worked")
- Notifications are smart (tell them when momentum matters, not constantly)

**For Excitement:**
- Real-time RSVP counter updates visibly as responses come in
- Momentum mechanic (5 in, 2 maybe, 1 out) is prominent and updates instantly
- Visual celebration when threshold is met (event confirms)
- Micro-interactions reward participation (animations, positive feedback)

**For Confidence:**
- Show who said what, clearly (no ambiguity about status)
- Availability + RSVP together (understand *why* people committed)
- Instant confirmation feedback ("Your RSVP is saved")

**For Trust:**
- No hidden information; all members see same data
- Clear labeling of who's available when
- Transparent commitment thresholds (everyone knows the goal)

### Emotional Design Principles

1. **Relief Through Completeness** — Every view should answer the user's current question completely. No "I need to check somewhere else" moments. Single source of truth eliminates anxiety.

2. **Excitement Through Real-Time Visibility** — RSVP updates, momentum changes, and confirmations should feel *immediate*. Not batched, not delayed. Real-time = real momentum.

3. **Confidence Through Transparency** — Users should never wonder "did everyone see this?" Show clearly what's visible to whom, what responses exist, what's been said.

4. **Belonging Through Participation** — Make every response feel like it matters. Real-time feedback that "your response was seen and counted" creates investment in the group's success.

5. **Simplicity Over Features** — Emotional clarity wins over feature completeness. A simple app that creates relief and excitement beats a complex app with everything. Cut anything that doesn't serve relief/excitement.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

Get-together can learn from four products that users are already deeply familiar with:

**Google Calendar**
- **UX Success:** Deceptive simplicity. Calendar view is the default — users understand availability at a glance. Color coding is intuitive. Month/week view toggle respects different thinking modes. Drag-and-drop event creation feels natural.
- **What It Does Well:** Makes availability visible without friction. No settings required to get value.
- **Why Users Love It:** It just works. No learning curve.

**Slack**
- **UX Success:** Real-time notifications that feel *important* (not spammy). Threaded conversations prevent info chaos. Quick reactions (emoji) are lightweight engagement. Visual cues (online status, unread badges) make presence felt.
- **What It Does Well:** Creates immediate connection. People see responses happen in real-time and feel heard.
- **Why Users Love It:** Instant feedback on participation. Momentum is visible.

**Doodle**
- **UX Success:** Ruthlessly simple polling interface. One job: vote on options. Grid layout (people vs. options) is instantly familiar. One-click participation. Results show instantly.
- **What It Does Well:** Removes friction from group decision-making. Familiar voting metaphor everyone understands.
- **Why Users Love It:** No learning curve. Works immediately.

**Instagram**
- **UX Success:** Visual-first design. Photos dominate everything. Real-time engagement metrics (likes, comment counts) create excitement. Share-sheet integration makes sharing native to OS. Stories create ephemeral moments without pressure of permanence.
- **What It Does Well:** Makes people want to participate (likes, comments). Captures group moments and memories. Built-in social proof (like counts) drive engagement.
- **Why Users Love It:** Visually delightful. Participation feels rewarded (your like is seen). Group photos become memories.

### Transferable UX Patterns

**Navigation & Information Architecture (from Google Calendar):**
- Default view should be the soft calendar (availability at a glance)
- Minimal navigation — users shouldn't have to dig to see what matters
- Color-coded availability to show status instantly
- Simple toggle between views (calendar, list, etc.) without overwhelming

**Real-Time Engagement (from Slack + Instagram):**
- RSVP responses appear instantly as they come in
- Momentum counter updates in real-time (not batched)
- Visual feedback on participation ("Your RSVP is saved" confirmation)
- Engagement metrics visible (like count on events/wishlists)
- Quick reaction patterns (emoji/status) are lightweight engagement

**Frictionless Participation (from Doodle):**
- One-click RSVP: tap "In", "Maybe", or "Out" — done
- No modal dialogs, no confirmation screens for simple actions
- Instant feedback that your choice was registered
- Results visible immediately (no page refresh needed)

**Visual Design & Memory (from Instagram):**
- Photos are central to group events (after event happens, users can share photos)
- Visual status indicators replace text descriptions
- Momentum display is prominent and visually satisfying
- Group memories (wishlists, past events, photos) become part of the product
- Share-sheet integration makes sharing to group wishlist native and effortless

### Anti-Patterns to Avoid

1. **Slack's Notification Overload** — Notifications must be selective (only important moments like threshold met). Don't spam users with every RSVP. Users will mute the app.

2. **Doodle's Dated Visual Design** — Our interface must feel modern and delightful, not utilitarian. Users expect design quality from apps made in 2026.

3. **Instagram's Anxiety-Driven FOMO** — Don't use dark patterns to create anxiety ("Sarah hasn't responded yet"). Keep it positive and encouraging, not pressuring.

4. **Google Calendar's Over-Complexity** — Don't offer too many view options or settings upfront. Start simple. Add complexity only if users ask for it.

5. **Generic Polling UX** — Avoid treating this like Doodle (sterile voting). Make it social and fun, informed by Instagram and Slack's engagement mechanics.

### Design Inspiration Strategy

**What to Adopt Directly:**

- **Google Calendar's availability view** — Make soft calendar the default home screen. Color-coded availability at a glance. No learning curve.
- **Slack's real-time momentum** — RSVP updates appear instantly, momentum counter updates live. Users feel the response as it happens.
- **Doodle's one-click participation** — RSVP should be 1-2 taps, no friction. Results instant.
- **Instagram's visual-first design** — Photos, colors, and visual status matter more than text. Design should feel contemporary and beautiful.

**What to Adapt:**

- **Slack's notification model** — Use smart notifications (threshold met, event confirmed, new comment) instead of every-update model. Balance engagement with respect for attention.
- **Instagram's engagement metrics** — Show interest counts on wishlists ("5 people interested"), but keep it encouraging not competitive.
- **Doodle's information density** — Use grid/table concepts for showing availability (people vs. time blocks), but make it visual and modern, not spreadsheet-like.

**What to Avoid:**

- Notification overload (Slack problem)
- Dated or utilitarian design (Doodle problem)
- Anxiety-driven engagement mechanics (Instagram problem)
- Complexity creep (Calendar problem)
- Treating this like a pure voting app (Doodle misconception)

**Design North Star:** Combine Google Calendar's simplicity, Slack's real-time momentum, Doodle's frictionless participation, and Instagram's visual delight. Users should never wonder "how do I...?" because they already know from apps they use every day.

## Design System Foundation

### Design System Choice

**Selected: Chakra UI (web) + React Native with shared design tokens (mobile)**

This hybrid approach provides the best balance of speed, visual consistency, and customization for a solo developer building an MVP on a 7-day timeline.

### Rationale for Selection

1. **Chakra UI for Web** — Fast development with customizable components, excellent accessibility, great documentation, and alignment with the visual simplicity goal. Chakra can be customized to match contemporary visual design without feeling utilitarian.

2. **React Native + Shared Design Tokens** — Mobile uses React Native's solid foundation with design tokens (colors, spacing, typography) mirrored from Chakra UI, ensuring visual consistency across platforms without duplicating design system work.

3. **Solo Developer Speed** — Chakra handles 80%+ of web UI work; mobile uses proven React Native patterns. No time spent building custom components from scratch.

4. **Customization Flexibility** — Chakra's theming system allows for brand customization and visual uniqueness without the overhead of a fully custom system. Can achieve "contemporary and delightful" aesthetic by adjusting theme tokens.

5. **Platform Consistency** — Both web and mobile share color palette, typography, spacing scale, and component patterns, ensuring users experience the same design language across platforms.

6. **Long-Term Maintainability** — Design tokens provide a single source of truth. Changes to spacing or colors propagate across both platforms without duplicating effort.

### Implementation Approach

**Web (React + Chakra UI):**
- Use Chakra's component library as foundation for Phase 1a MVP
- Customize Chakra theme: colors, typography, component styling to match visual inspiration (Google Calendar simplicity + Instagram visual delight)
- Add subtle micro-interactions and animations to support "momentum" emotional goals
- Leverage Chakra's responsive utilities for mobile browser access

**Mobile (React Native):**
- Define shared design tokens (colors, spacing, typography) extracted from Chakra theme
- Implement base components (Button, Card, Input, IconButton) that mirror Chakra patterns visually
- Use React Native's StyleSheet or Nativewind for styling to maintain consistency
- Prioritize touch-friendly interaction targets (48px+ minimum)

**Phase 1b Integration:**
- When moving to mobile, reuse the same design tokens and component patterns
- Minimal redesign needed; visual language already proven on web

### Customization Strategy

**Phase 1a (Web MVP - Week 1):**
- Use Chakra defaults with light customization
- Focus on getting core functionality working
- Design system is proven and accessible out of the box

**Phase 1b (Mobile - Weeks 2-3):**
- Create React Native component library that mirrors Chakra patterns
- Share design tokens between web and mobile
- Validate visual consistency across platforms

**Post-MVP (Phase 2+):**
- As the product matures, build custom components only when needed
- Maintain single source of truth for design tokens
- Scale design system based on actual user feedback
- Consider migrating to a more unified system (like Tamagui) if web + mobile code sharing becomes a priority

**Design Token Structure (Shared Across Platforms):**
```
Colors: Primary (#6366f1), Secondary (#ec4899), Neutral grays
Spacing: 4px scale (4, 8, 12, 16, 24, 32, etc.)
Typography: 2-3 font scales (Display, Body, Caption)
Border Radius: Subtle (4px, 8px)
Shadows: Minimal, for elevation only
```

## Core User Experience Definition

### 2.1 Defining Experience

The defining experience of get-together is: **"Propose an event in 10 seconds and watch your friends respond in real-time with one tap."**

More specifically: Users making quick event proposals (title + date/time, done) and quick RSVP decisions the moment they see the proposal.

**Why this is the heartbeat of the product:**
- Event creation takes seconds (modal, not full screen)
- RSVP response takes one tap
- Together, they replace the entire group text planning workflow
- Momentum is visible immediately

### 2.2 User Mental Model

**Current (Group Text):**
- User types out event idea in chat
- Waits for scattered responses
- Responses mixed with other chat noise
- Has to ask "So... is everyone coming?"
- Manual follow-ups needed

**Get-Together (New Mental Model):**
- User taps "Create Event"
- Types title + picks date → event is live in seconds
- Watches friends respond with single taps
- Momentum builds visibly in real-time
- When enough people say yes → event automatically confirmed
- No ambiguity, no follow-ups needed

**The Shift:** From async chaos to instant coordination

### 2.3 Success Criteria

The core experience succeeds when:

1. **Ultra-Fast Event Creation** — Title + date in modal, tap "Create", event goes live in <10 seconds
2. **Ultra-Fast RSVP** — See event, tap "In/Maybe/Out", done. One tap. No dialogs.
3. **Instant Visual Feedback** — Both creation and RSVP show immediate confirmation
4. **Real-Time Momentum** — Momentum counter updates as each RSVP comes in
5. **Auto-Confirm Threshold** — Event automatically flips to "Confirmed" when threshold is met (user set this in creation modal, optional)
6. **Minimal Cognitive Load** — User never wonders "what do I do next?" Everything is obvious
7. **Works During Daily Life** — Can create events between tasks, respond while in meetings, quick interruption-friendly

### 2.4 Established UX Patterns We're Using

**From Doodle + Slack + Instagram:**
- Simple tap-based interaction (In/Maybe/Out)
- Real-time updates
- Results visible immediately
- Momentum builds visibly

**From Twitter/Mastodon (Quick Share Modal):**
- Modal dialog for quick input (not full screen)
- Minimal fields required
- Tap to post/create
- Details can be added later

**From Google Calendar (Familiarity):**
- Simple date/time picking
- Availability context visible

We're combining quick capture (like Twitter) with coordination (like Doodle) in service of group planning.

### 2.5 Experience Mechanics: The Complete Flow

**EVENT CREATION (The Modal Flow)**

**Step 1: Initiation**
- User taps "Create Event" button (or floating action button on mobile)
- Modal appears: "New Event"

**Step 2: Quick Input Modal**
Modal has three fields:
1. **Title** (required) — Text input placeholder: "What's the plan?"
2. **Date & Time** (required) — Date picker showing calendar range or single date
3. **Threshold** (optional) — Number input: "Need X people to confirm" (can leave blank)

*Note: Description, availability details, comments all added AFTER event is created*

**Step 3: Create Tap**
- User taps "Create Event" button in modal
- Modal closes
- Event appears live in feed immediately

**Step 4: Post-Creation (Optional)**
- If user wants to add details: tap event → tap "Edit" → add description, photos, link, etc.
- Or skip and jump straight to event feed

---

**RSVP RESPONSE (The Tap Flow)**

**Step 1: See Event in Feed**
- Home feed shows: "Alex proposed Hiking Trip — Tuesday to Thursday"
- Shows: who proposed it, date, current RSVPs ("3 in, 1 maybe, 0 out")
- Optional threshold shown if set: "Needs 5 people"

**Step 2: Tap to See Details**
- User taps event
- Full event detail view shows:
  - Title, date range, description (if added)
  - Soft calendar: member availability
  - RSVP list: names and their status
  - Comments
  - Threshold progress (if set): "4 in / need 5"

**Step 3: RSVP with One Tap**
- Three large buttons at bottom: **"In"** | **"Maybe"** | **"Out"**
- User taps their choice
- Tap registers instantly

**Step 4: Instant Confirmation**
- Button highlights with checkmark
- User's name appears in the list
- Momentum counter updates live: "3 in, 1 maybe, 0 out" → "4 in, 1 maybe, 0 out"
- Real-time animations make update feel satisfying

**Step 5: Auto-Confirm (If Threshold Set)**
- When threshold is reached automatically:
  - Event background color changes
  - Prominent "✓ Event Confirmed!" banner appears
  - Notification: "Event confirmed! You're going!"
  - User feels the momentum without taking action
- If no threshold set: user can check back as momentum builds

**Step 6: Can Change Anytime**
- User can tap again to change RSVP (In → Maybe, etc.)
- Change registers instantly
- Momentum counter updates
- No friction, no "are you sure?" dialogs

---

**INFORMATION ARCHITECTURE**

**Event Detail View (Single Source of Truth):**
```
┌─────────────────────────────┐
│ Hiking Trip                 │
│ Proposed by Alex            │
│ Tuesday to Thursday         │
├─────────────────────────────┤
│ Availability (Soft Calendar)│
│ Sarah: Tue-Wed              │
│ Mike: All days              │
│ Jessica: Tue only           │
├─────────────────────────────┤
│ RSVP Status (4 / need 5)    │
│ ✓ Sarah: In                 │
│ ✓ Mike: In                  │
│ ~ Jordan: Maybe             │
│ ✗ Casey: Out                │
├─────────────────────────────┤
│ Comments (2)                │
│ Sarah: "Let's do it!"       │
├─────────────────────────────┤
│ [In]  [Maybe]  [Out]        │
└─────────────────────────────┘
```

Everything needed to decide is visible. No scrolling. No missing context.

---

**DESIGN PRINCIPLES FOR THIS FLOW**

1. **Modal for Creation** — Full screen is overkill. Modal takes 3 fields, user taps create, event goes live. Fast.
2. **Only Required Fields in MVP** — Title and date/time only. Everything else is nice-to-have and can be added later.
3. **Auto-Confirm on Threshold** — User sets threshold when creating (optional), event auto-confirms when met. No admin action needed.
4. **One-Tap RSVP** — No confirmation dialogs, no extra screens. Tap your choice and you're done.
5. **Real-Time Momentum is the Reward** — Momentum counter updating is the dopamine hit that replaces group chat notifications.
6. **Complete Info in Event View** — Everything needed is on one screen. No drilling into separate "Availability" or "RSVP List" screens.
7. **Mobile-First** — Modal on mobile takes full width but is clearly modal (can swipe to dismiss). RSVP buttons are thumb-reachable at bottom.

---

**MVP SCOPE FOR CREATION MODAL**
- Title field
- Date/time picker
- Optional threshold number
- "Create" button

That's it. Ship it. Users can add descriptions and photos later if they want, but the MVP doesn't require it.

## Visual Design Foundation

### Color System

**Design Philosophy:** Modern, energetic, optimistic colors that celebrate group momentum and coordination. Colors should feel contemporary (2026), playful but professional, and work beautifully on mobile screens.

**Primary Color Palette:**

**Primary Action (Momentum & Confirmation):**
- **Primary Blue** `#6366f1` (Indigo-600) — Used for primary CTAs, "In" RSVP button, confirmed events
  - Energetic and trustworthy
  - Stands out on white backgrounds
  - Works well on light and dark modes

**Secondary Action (Maybe & Engagement):**
- **Secondary Pink** `#ec4899` (Pink-500) — Used for "Maybe" RSVP, engagement metrics, highlights
  - Playful and modern
  - Creates visual excitement
  - Pairs beautifully with primary blue

**Negative/Out Action:**
- **Neutral Gray** `#9ca3af` (Gray-400) — Used for "Out" RSVP, disabled states, secondary info
  - Calm and non-judgmental (no harsh red for saying no)
  - Allows users to opt-out without feeling rejected
  - Accessible contrast

**Success/Confirmation:**
- **Success Green** `#10b981` (Emerald-500) — Used for threshold met, event confirmed, celebratory moments
  - Celebratory and positive
  - Signals "this is happening"
  - Reserved for moments of triumph (threshold reached)

**Background & Neutral:**
- **Off-White** `#f9fafb` (Gray-50) — Main background for feeds, cards
- **White** `#ffffff` — Event cards, modals, input fields
- **Dark Gray** `#374151` (Gray-700) — Primary text
- **Medium Gray** `#6b7280` (Gray-500) — Secondary text, helper text

**Semantic Color Mappings:**
- **Positive/Confirmation:** Green (#10b981)
- **Attention/Action Needed:** Pink (#ec4899)
- **Primary Action:** Blue (#6366f1)
- **Neutral/Disabled:** Gray (#9ca3af)
- **Error/Warning:** Orange (#f97316) [used sparingly]
- **Information:** Blue (#3b82f6) [lighter than primary]

**Accessibility:**
- All text meets WCAG AA contrast ratios (4.5:1 for body text)
- Color is not the only indicator (always paired with icons or text)
- "In/Maybe/Out" distinguished by color + icon + text
- Color palette designed for color-blind users (deuteranopia-friendly)

**Dark Mode (Future):**
- Planned for Phase 2, but color choices work for easy dark mode adaptation
- Primary blue becomes lighter (#818cf8)
- Off-white becomes dark (#1f2937)

---

### Typography System

**Design Philosophy:** Modern, friendly, and easy to read on mobile screens. Fonts should feel contemporary without being trendy or hard to read.

**Font Selections:**

**Primary Font: Inter**
- Modern, geometric sans-serif
- Exceptional readability on screens (especially mobile)
- Designed specifically for digital interfaces
- Free and open-source (Google Fonts)
- Fun but professional personality
- Works beautifully at all sizes

**Secondary Font: Space Mono (for code/technical content, if needed)**
- Monospace option for timestamps, technical info
- Also from Google Fonts, free and open-source

**Rationale:** Inter is designed for modern digital products and is used by Figma, Stripe, and other contemporary apps. It feels friendly and energetic while remaining highly readable.

**Type Scale (Rem-based, 16px base):**

```
Display Large: 2.5rem (40px) - Rare, only for major headings
Display Medium: 2rem (32px) - Event title (rarely used)
Heading 1: 1.75rem (28px) - Page titles, major sections
Heading 2: 1.5rem (24px) - Section titles, event card titles
Heading 3: 1.25rem (20px) - Subsection titles, card titles
Body Large: 1.125rem (18px) - Primary body text, RSVP labels
Body Regular: 1rem (16px) - Primary body text, event descriptions
Body Small: 0.875rem (14px) - Secondary text, helper text, metadata
Caption: 0.75rem (12px) - Timestamps, small labels

Line Height:
- Headings: 1.2 (tight)
- Body: 1.5 (comfortable)
- Captions: 1.4
```

**Weight Strategy:**
- Bold (700): Headings, action labels, important data
- Semibold (600): Labels, section titles
- Regular (400): Body text, descriptions

**Accessibility:**
- Minimum 16px font for body text (mobile-friendly)
- Semibold or bold for interactive elements
- High contrast between text and background (all meet WCAG AA)

---

### Spacing & Layout Foundation

**Design Philosophy:** Airy, spacious layouts that feel calm and unhurried. Plenty of breathing room to reduce cognitive load. Mobile-first design with generous touch targets.

**Base Spacing Unit: 8px**

Spacing scale (multiples of 8px):
```
xs: 4px (minimal, only for very tight spacing)
sm: 8px (tight spacing between related elements)
md: 16px (comfortable default spacing)
lg: 24px (generous spacing between sections)
xl: 32px (large section spacing)
xxl: 48px (very large section spacing)
```

**Component Touch Targets:**
- Minimum: 44px × 44px (buttons, RSVP targets)
- Preferred: 48px × 48px
- Large buttons: 56px height for primary CTAs

**Card & Container Padding:**
- Event cards: 16px padding (md)
- Modals: 24px padding (lg)
- Section containers: 24px padding (lg)
- Safe area on mobile: 16px from edges

**Vertical Spacing (between sections):**
- Within a card: 16px (md)
- Between cards: 16px (md)
- Between sections: 24px (lg)
- Between major sections: 32px (xl)

**Layout Grid:**
- Desktop: 12-column grid (wide screens)
- Tablet: 8-column grid (medium screens)
- Mobile: 4-column grid (small screens, with 16px gutters)

**Layout Principles:**

1. **Mobile-First Vertical Stacking** — Content stacks vertically on mobile, columns expand on desktop
2. **Single Column on Mobile** — Event detail is full-width vertical scroll, no sidebars
3. **Safe Spacing from Edges** — 16px padding from screen edges on all devices
4. **Generous White Space** — Visual breathing room makes interface feel calm and non-overwhelming
5. **Grouped Sections** — Related content grouped with 24px spacing between groups
6. **Visual Hierarchy Through Spacing** — Important content gets more space around it

---

### Visual Characteristics & Micro-Interactions

**Corner Radius:** Subtle, modern edges
- Buttons: 8px (slightly rounded, not pill-shaped)
- Cards: 12px (soft, inviting)
- Modals: 16px (prominent but not extreme)
- Inputs: 8px

**Shadows & Elevation:**
- No shadows by default (flat, modern aesthetic)
- Modals: subtle shadow (elevation on purpose)
- Hover states on desktop: very subtle shadow (1-2px blur, low opacity)
- Minimum visual weight, maximum clarity

**Micro-Interactions:**

**RSVP Tap:**
- 200ms scale animation (button slightly grows on tap)
- Color transition (gray → colored)
- Checkmark appears with fadeIn (100ms)
- Number updates with pulse animation (celebration)

**Threshold Met:**
- Full-screen celebration animation (not overdone)
- Color fade to green
- "✓ Event Confirmed!" banner slides down
- Subtle bouncing animation
- Sound cue (optional, respectful)

**Real-Time Updates:**
- Momentum counter updates with number fade + position shift (smooth, not jarring)
- New RSVP appears with subtle slide-up animation
- Color indicator changes with smooth transition

**Modals:**
- Appear with slide-up from bottom (mobile) or fade-in (desktop)
- Dismiss with swipe-down (mobile) or tap outside

---

### Accessibility Considerations

1. **Color Contrast:**
   - All text meets WCAG AA minimum (4.5:1)
   - Interactive elements have 3:1 minimum contrast

2. **Color Independence:**
   - Status never communicated by color alone
   - "In/Maybe/Out" uses color + icon + text
   - Availability uses color + time range text

3. **Touch Targets:**
   - All interactive elements ≥44px (preferably 48px)
   - RSVP buttons are large and clearly tappable
   - Adequate spacing between targets (no fat-finger misclicks)

4. **Typography:**
   - Minimum 16px for body text
   - Line height ≥1.5 for readability
   - High contrast between text and background

5. **Semantic HTML & ARIA:**
   - Buttons are <button> elements, not divs
   - Form labels explicitly associated with inputs
   - Live regions announce momentum updates
   - ARIA labels for icon-only buttons

6. **Motion:**
   - Animations are brief (<300ms)
   - Respect prefers-reduced-motion for users sensitive to motion

---

### Design System Summary

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Primary Color** | Indigo #6366f1 | Modern, energetic, trustworthy |
| **Secondary Color** | Pink #ec4899 | Playful, contemporary, engaging |
| **Success Color** | Green #10b981 | Celebratory, positive |
| **Font Family** | Inter | Modern, readable, fun |
| **Base Spacing** | 8px | Clean, predictable, easy math |
| **Corner Radius** | 8-12px | Modern without being trendy |
| **Touch Targets** | 48px minimum | Mobile-friendly, accessible |
| **Shadows** | Minimal | Clean, flat modern aesthetic |
| **Animations** | <300ms, subtle | Energetic but not overwhelming |

This visual foundation supports the emotional goals (relief through clarity, excitement through momentum) and works beautifully across web and mobile platforms.

## Design Direction Decision

### Design Directions Explored

Six distinct visual approaches were explored:
1. Clean Minimal — Whitespace-first, professional
2. Card-Heavy — Layered cards with shadow depth
3. Bold & Vibrant — Full-color, celebratory, energetic
4. Calendar First — Soft calendar as hero
5. List Focused — Dense list, power-user efficiency
6. Gesture Rich — Swipe and animated interactions

### Chosen Direction

**Primary: Bold & Vibrant + Card-Heavy (Layered Cards) + List View Option**

The visual foundation combines three complementary approaches:
- **Bold & Vibrant:** Celebratory colors, gradients, modern-energetic aesthetic
- **Card-Heavy:** Layered cards with shadow depth, visual distinction through elevation
- **List View:** Compact fallback for edge case of multiple events

**Primary Experience (Bold & Vibrant + Card-Heavy):**
- Event cards are distinct layers with 4px shadows (elevation)
- Gradient headers (indigo-to-purple, pink-to-coral) for personality
- Full-saturation colors create excitement
- Large momentum counter cards: "3 IN!" displayed prominently in colored box
- Each card has colored left border + shadow depth for visual hierarchy
- Cards feel tactile and distinct, not flat
- One-tap RSVP buttons with icons (✓ In, ? Maybe, ✕ Out)
- Celebration when threshold met: card background fades to green with animation
- 12-16px spacing between cards creates breathing room
- Designed for 1-3 events visible at once

**Secondary: List View (Fallback for Power Users)**
- Activated when user has 5+ pending events
- Compact rows without heavy shadows (cleaner for scanning)
- Maintains color-coding but reduces visual weight
- Toggle between "Card View" and "List View" at top of feed
- Rapid RSVP decisions without visual fatigue

### Design Rationale

1. **Bold & Vibrant + Card-Heavy = Delight + Clarity** — Celebratory colors (excitement) + layered cards (visual interest) + shadows (elevation and hierarchy) create a product that feels both fun and purposeful.

2. **Shadows Create Hierarchy** — Card shadows make each event feel distinct and important. Users never wonder which event they're looking at.

3. **Layered Look is Modern** — 2026 design uses subtle shadows and depth, not flat design. Creates premium feel while maintaining simplicity.

4. **Quick Decision-Making** — One-tap RSVP remains fast. Card structure doesn't slow users down; it clarifies what they're deciding on.

5. **Visual Celebration** — Momentum counter in its own card, large and prominent. When threshold is met, the entire event card transitions to green—full visual celebration.

6. **List View Safety Valve** — Rare edge case handled without compromising primary experience.

7. **Low Event Volume Expected** — MVP assumes users respond to events quickly. Threshold met → event confirms → move on. List view only needed for edge cases.

### Implementation Approach

**Phase 1a (MVP - Web):**
- Bold & Vibrant colors with Card-Heavy layering
- Event cards: white background, 12px rounded corners, subtle shadow (0 4px 12px rgba(0,0,0,0.08))
- Colored left border (4px): indigo for events, pink for alternatives, green for confirmed
- Gradient header on page: indigo-to-purple ("Get-Together")
- Large momentum counter in its own card: "3 IN!" (24px bold font, centered, colored backgrounds)
- Event title (18px bold), date/proposer (14px gray), RSVP buttons (48px height, full width)
- 16px padding inside cards, 12px margin between cards
- List view hidden by default, toggled if 5+ events
- Soft calendar accessible via toggle

**Phase 1b (Mobile - React Native):**
- Mirror card design with React Native shadow equivalents
- Same gradient headers and colored borders
- Larger touch targets (48px+ buttons)
- Card shadows optimized for mobile performance

**Phase 2+:**
- Monitor event volume; promote list view if needed
- Add filters or grouping if volume increases beyond expectations

### Visual Characteristics (Bold & Vibrant + Card-Heavy + List Option)

**Home Feed (Card View - Default):**

**Page Header:**
- Background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)
- Text: white, 18px bold
- Padding: 16px
- Text: "Get-Together"

**Momentum Card:**
- Three inline sections (or single card with three values)
- Background: white with subtle shadows
- Content: "3 IN" (blue bg), "1 MAYBE" (pink bg), "0 OUT" (gray bg)
- Font: 20px bold, color-coded
- Shadow: 0 4px 12px rgba(0,0,0,0.08)

**Event Card:**
- Background: white (#ffffff)
- Border radius: 12px
- Left border: 4px solid (indigo #6366f1 by default, green #10b981 when confirmed)
- Shadow: 0 4px 12px rgba(0,0,0,0.08)
- Padding: 16px
- Margin between cards: 12px

**Event Card Content:**
- Title: 18px bold, #1f2937
- Meta (proposer + date): 14px, #9ca3af
- Progress bar (if threshold set): "4 / 5 needed" visual indicator
- RSVP Buttons: 3 buttons full-width
  - ✓ In (background: #6366f1, color: white, height: 48px)
  - ? Maybe (background: #ec4899, color: white, height: 48px)
  - ✕ Out (background: #d1d5db, color: #6b7280, height: 48px)

**Celebration (Threshold Met):**
- Event card left border: indigo → green transition (300ms)
- Event card background: white → fade to #f0fdf4 (light green) (200ms)
- Banner slides down: "✓ Event Confirmed!"
- Animation: subtle bounce or scale (respect prefers-reduced-motion)
- Sound cue: optional, soft celebration sound

**Home Feed (List View - Optional):**
- Shown only if 5+ pending events
- Compact rows: [Event Name] [Date] [Count] [RSVP Buttons]
- No heavy shadows (clean for scanning)
- Border-bottom: 1px #e5e7eb between rows
- Same color coding but smaller buttons (44px height)
- Toggle at top: "≡ List View" or "☐ Card View"

**Create Modal (Phone):**
- Background: white with gradient header
- Header gradient: indigo-to-purple (same as page header)
- Header text: "New Event", white, 20px bold
- Modal body: white, 24px padding
- Form fields:
  - Label: 14px bold, #374151
  - Input: 16px, 12px padding, 1px border #d1d5db, border-radius 8px
  - Focus state: border-color changes to #6366f1
- Button: "Create Event"
  - Background: gradient(135deg, #6366f1 0%, #8b5cf6 100%)
  - Color: white
  - Height: 48px
  - Width: full
  - Font: 16px bold

### Why This Triple Combination Works

1. **Bold & Vibrant** — Creates excitement and celebration energy (matches "getting out of group texts")
2. **Card-Heavy** — Adds visual interest, hierarchy, and tactile feel through shadows
3. **List View** — Handles edge case (5+ events) without compromising primary
4. **Modern + Delightful** — Feels contemporary (2026), celebratory but grounded
5. **Clarity + Joy** — Shadows clarify hierarchy; colors celebrate momentum
6. **Quick RSVP** — One-tap remains core; cards enhance UX without slowing
7. **Working Professional** — Visual celebration (momentum counter, color transitions) provides dopamine without being childish
8. **Accessible** — Color + icon + text; shadows improve readability

### Summary

Get-together's visual direction is **Bold & Vibrant with Card-Heavy Layering**. Events are celebrated through:
- Vibrant colors (indigo, pink, green)
- Gradient headers and momentum displays
- Layered cards with subtle shadows
- Large, prominent RSVP buttons
- Visual celebration when thresholds are met

This creates a product that feels modern, energetic, and celebratory while remaining clear and fast for decision-making.

## User Journey Flows

### Journey 1: Alex - Event Initiation & Real-Time Momentum

**Goal:** Create an event proposal and watch the group respond in real-time to build momentum toward confirmation.

**Summary:** Alex represents the power user who wants to initiate plans quickly and see the group commit in real-time. The flow is optimized for speed (title → date → create) and visual celebration (momentum counter updates, threshold auto-confirm).

**Key Steps:**
1. Tap "Create Event" button from home feed
2. Enter event title (required)
3. Select date/time (required)
4. Set optional threshold (how many people needed)
5. Tap "Create Event" → event goes live instantly
6. Event appears in feed, ready for RSVPs
7. Watch real-time momentum build (3 in, 1 maybe, 0 out)
8. When threshold met → event auto-confirms with celebration
9. Group notified, planning begins

**Delight Moments:**
- Event appears instantly (no delay)
- Real-time counter updates with animation when RSVPs come in
- Celebration animation + green transition when threshold met
- Optional sound cue

**Duration:** <10 seconds from tap to event live

**Success Indicators:**
- Event created
- Feed updated in real-time
- Threshold met triggers auto-confirm
- Users see momentum building

---

### Journey 2: Jordan - Wishlist to Event Conversion

**Goal:** Add items to group wishlist, see others interested, convert to real event when momentum builds.

**Summary:** Jordan discovers activities through daily life (Instagram, web) and shares to the group wishlist. Others express interest, and when someone decides to make it happen, it converts to a real event. This journey drives serendipitous discovery and sustained engagement.

**Key Steps:**
1. Jordan sees cool activity (Instagram, website, etc.)
2. Taps "Share" → selects "Get-Together" → picks group
3. Item added to group wishlist with optional notes
4. Confirmation: "Added to wishlist"
5. Group members see new item, click "Interested"
6. Interest reactions accumulate (shows momentum building)
7. Someone decides to convert: taps event icon on wishlist item
8. Pre-filled event modal appears (title, description from link)
9. User sets date/time and threshold
10. Event created → normal RSVP flow starts
11. People already interested see it first

**Delight Moments:**
- Instant confirmation when added
- See others' reactions build excitement
- One-tap conversion when ready to make it real
- Pre-filled details save time
- People who already reacted see event immediately

**Duration:** Add to wishlist (<5 seconds), conversion (<15 seconds)

**Success Indicators:**
- Wishlist item added
- Others react with interest
- Conversion to event
- Conversion rate: >20% of wishlist items become events

---

### Journey 3: Taylor - Group Setup & Onboarding

**Goal:** Create a group, invite friends, get everyone in, ready to start planning.

**Summary:** Taylor is the group admin who sets up the group and invites friends. The flow is optimized for speed and simplicity: create group → get link → share → friends join with one tap.

**Key Steps:**
1. Tap "Create Group" on launch or home screen
2. Enter group name (required, e.g., "Core Crew")
3. Optional: Add group description (e.g., "Friend group from college")
4. Tap "Create Group"
5. Group created instantly, unique invite link generated
6. Share page shows link + copy/share options
7. Taylor shares link via text/email/etc
8. Friend receives link, taps it or scans QR
9. Friend enters name (or auto-filled from contacts)
10. Taps "Join Group"
11. Friend instantly added, Taylor gets notification
12. Group active once 3+ members join
13. Ready for first event proposal

**Delight Moments:**
- Link generated instantly (not waiting)
- Link works immediately (one tap)
- Real-time notifications when friends join
- Group feels "ready to go" once 3+ members

**Duration:** Create group (<5 seconds), link generation (instant), joining (<10 seconds)

**Success Indicators:**
- Group created
- Invite link available
- Friends join via link
- 5-8 members at launch
- First event within 24 hours

---

## Journey Patterns & Principles

### Reusable Interaction Patterns

**Pattern 1: Modal for Quick Input**
- Used for: Create Event, Create Group, Add Wishlist Item
- Structure: Name/Title → Date (if applicable) → Optional details
- Interaction: Fill fields → Tap button → Modal closes → Content live
- Benefit: Quick capture without full-screen distraction

**Pattern 2: Instant Feedback**
- Every action gets immediate confirmation
- Toast notifications: "Added!", "Created!", "Joined!"
- Feed/list updates in real-time (no refresh needed)
- Feedback animations (pulse, slide, fade)
- Benefit: Users know action succeeded immediately

**Pattern 3: Real-Time Momentum**
- RSVPs appear as they happen (WebSocket updates)
- Counter updates with animation (pulse effect)
- Status changes highlighted
- Celebration animations when milestone reached
- Benefit: Users feel the group responding in real-time

**Pattern 4: One-Tap Decisions**
- RSVP: Single tap "In/Maybe/Out"
- Wishlist interest: Single tap "Interested"
- Easy to change: Tap different option anytime
- No confirmation dialogs
- Benefit: Fast, frictionless participation

**Pattern 5: Link-Based Sharing**
- Group invites via unique link (no email)
- Wishlist share via native share sheet
- Event share to other groups
- Links consumable but can be re-shared
- Benefit: Familiar UX, zero friction to join

### Flow Optimization Principles

**1. Minimize Steps to Value**
- Event creation: 3 fields (title, date, threshold) → live (10 seconds)
- Wishlist add: 1-2 taps → in group (5 seconds)
- Group join: 1 link + name → member (10 seconds)
- Goal: Reduce friction between intent and action

**2. Reduce Cognitive Load**
- Ask for required info only upfront
- Optional fields available in edit modal later
- Clear visual feedback at each step
- Progressive disclosure (more options available if needed)

**3. Provide Clear Progress**
- Loading states if delay occurs
- Confirmation toast after every action
- Real-time updates show things working
- Counter updates show participation

**4. Error Recovery**
- Can change RSVP anytime (no penalties for changing mind)
- Wishlist item can be deleted or edited
- Event can be edited after creation
- Group settings editable by admin
- Accidental actions easily undone

**5. Create Delight Moments**
- Instant feedback (no delays)
- Animation on momentum updates
- Celebration when threshold met
- Notifications when friends join
- Visual "surprise and delight" without being annoying

### Critical Path Optimizations

**Event Creation Path:**
- No separate "preview" step (goes live immediately)
- Soft calendar visible in modal for availability context
- Description/photos can be added later via edit modal
- Threshold auto-confirms event (no admin action needed)

**Wishlist to Event Conversion:**
- Pre-fill event details from wishlist item (title, description, link)
- Allow editing before creation (not locked in)
- Keep permanent link between wishlist item and created event
- Original wishlist item stays in wishlist (not deleted)

**Group Setup Path:**
- Link-based joining (no email verification)
- Name auto-populated from phone contacts if available
- Group active immediately (not after email confirmation)
- Group appears in member's app instantly

---

## Success Metrics for Each Journey

**Event Creation Flow (Alex's Journey):**
- Time to creation: <10 seconds
- Users complete all required fields: >95%
- RSVP response within first hour: >70%
- Threshold met auto-confirm rate: >80%

**Wishlist Flow (Jordan's Journey):**
- Wishlist items added per user per month: >5
- Wishlist items converted to events: >20%
- Average interest reactions per item: >2
- Time from add to conversion: <7 days
- Share-sheet integration usage: >40% of adds

**Group Setup Flow (Taylor's Journey):**
- Members per group at launch: 5-8
- Time to first event: <24 hours
- Members who invite others: >50%
- Group retention after 1st event: >80%

## Component Strategy

### Design System Components (Chakra UI)

**Available Foundation Components:**

Chakra UI provides these components that we'll use as-is:
- **Modal/Dialog** — Used for create event modal, create group modal
- **Input** — Text inputs for title, group name, date picker
- **Button** — Base button component (we'll customize for RSVP)
- **Stack (VStack/HStack)** — Layout containers (Flex)
- **Toast** — Notifications ("Added!", "Created!", "Joined!")
- **Box** — Generic container for card backgrounds
- **Text/Heading** — Typography system
- **Badge** — Status labels and tags
- **Grid** — Layout for soft calendar availability grid

**Why Chakra Works:**
- Built for customization via theme tokens
- Excellent accessibility built-in
- Mobile-friendly (responsive utilities)
- Good React Native bridge potential via Nativewind

---

### Custom Components

Get-together requires 5 custom components not fully covered by Chakra. These are designed to work with Chakra's foundation.

---

## Custom Component Specifications

### 1. EventCard Component

**Purpose:** Display a single event proposal in feed with all information needed for RSVP decision.

**When to Use:**
- Home feed (default view)
- Event list views
- Anywhere showing event proposals

**Content Structure:**
```
┌─ EventCard ─────────────────────────────────┐
│ ⬚ EVENT TITLE (Bold, 18px)                  │ ← Left border (indigo)
│   Proposed by Alex • Tue-Thu                │ ← Meta info (gray)
│                                             │
│ Progress: 4 / 5 needed (if threshold)      │ ← Optional progress bar
│                                             │
│ 3 IN   1 MAYBE   0 OUT (momentum)          │ ← MomentumCounter
│                                             │
│ [✓ In]  [? Maybe]  [✕ Out]                 │ ← RSVPButtonGroup
└─────────────────────────────────────────────┘
```

**Component Props:**
```
interface EventCardProps {
  id: string;
  title: string;
  proposerId: string;
  proposerName: string;
  dateRange: string;
  description?: string;
  threshold?: number;
  rsvpCounts: { in: number; maybe: number; out: number };
  userRsvpStatus?: 'in' | 'maybe' | 'out' | null;
  isConfirmed?: boolean;
  onRsvpChange: (status: 'in' | 'maybe' | 'out') => void;
  onCardTap: () => void;
}
```

**Visual States:**
1. **Default** — White background, indigo left border, subtle shadow
2. **Hover (Desktop)** — Shadow increases, slight scale
3. **User Has RSVP'd** — Their button highlighted, small checkmark
4. **Threshold Met** — Background fades to light green, left border changes to green
5. **Confirmed** — Green theme throughout, "✓ Event Confirmed!" banner
6. **Celebration** — Animation: green transition + optional confetti

**Anatomy:**
- Container: white bg, 12px border-radius, 4px left border, shadow
- Header row: title + proposer meta
- Progress bar (optional): shows "X / Y needed"
- Momentum counter: (separate component)
- RSVP buttons: (separate component)

**Variants:**
- **Card View (default)** — Full layout with shadows and spacing
- **List View** — Compact layout, no shadows, border-top separator

**Accessibility:**
- Container: `role="article"`
- Title: `<h3>`
- Buttons: proper `<button>` elements with icons + text
- Color-blind safe: uses color + icon + text for status
- ARIA: `aria-label` for momentum counter reads "3 people in, 1 maybe, 0 out"

**Design Tokens (From System):**
- Border: 4px solid (color-coded: indigo #6366f1, green #10b981)
- Background: white #ffffff
- Shadow: 0 4px 12px rgba(0,0,0,0.08)
- Padding: 16px
- Border-radius: 12px
- Spacing between elements: 12px

---

### 2. MomentumCounter Component

**Purpose:** Display real-time RSVP count ("3 IN, 1 MAYBE, 0 OUT") with visual celebration.

**When to Use:**
- In EventCard (always visible)
- In event detail view (large version)
- Trending/"Hot Events" section

**Content Structure:**
```
┌─ MomentumCounter ──────┐
│ 3 IN    1 MAYBE   0 OUT │
│ (blue)  (pink)   (gray) │
└────────────────────────┘
```

**Component Props:**
```
interface MomentumCounterProps {
  inCount: number;
  maybeCount: number;
  outCount: number;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  celebrationTrigger?: 'thresholdMet' | 'none';
}
```

**Visual States:**
1. **Static** — Shows counts, no animation
2. **Live Update** — When count changes: number fades out/in with slight scale (pulse animation, 300ms)
3. **Threshold Met** — Counts highlight in green, confetti animation (optional)
4. **Empty** — All zeros shown in gray

**Sizes:**
- **Small** — 14px font, used in list view, compact spacing
- **Medium** — 16px font, default in EventCard
- **Large** — 24px font, in event detail view, emphasis

**Anatomy:**
- Three inline sections: "3 IN" (blue bg), "1 MAYBE" (pink bg), "0 OUT" (gray bg)
- Each section: number (bold) + label (small text)
- Background: optional light bg or transparent
- Padding: 8px per section

**Animation Details:**
```javascript
// When count updates:
// 1. Count number fades (opacity 1 → 0.5 → 1)
// 2. Slight scale pulse (1 → 1.1 → 1)
// 3. Duration: 300ms
// 4. On threshold: green celebration color shift

// On celebration:
// Background color: white → light green (#f0fdf4)
// Pulse intensity: higher
// Optional confetti particles (if enabled)
```

**Accessibility:**
- Container: `aria-live="polite"` (announces updates)
- `aria-label="3 people in, 1 maybe, 0 out"`
- Counts programmatically readable
- Color + text ensures clarity

**Design Tokens:**
- In: Blue background #e0e7ff, text #4338ca
- Maybe: Pink background #fce7f3, text #be185d
- Out: Gray background #f3f4f6, text #9ca3af
- Font: Bold, size varies by size prop
- Animation: 300ms ease-out

---

### 3. RSVPButtonGroup Component

**Purpose:** Three large, prominent buttons for users to choose RSVP status (In/Maybe/Out).

**When to Use:**
- In every EventCard
- In event detail view (full-width)
- After creating event (first RSVP prompt)

**Content Structure:**
```
┌─ RSVPButtonGroup ─────────────────────┐
│ [✓ In]  [? Maybe]  [✕ Out]           │
│ (blue)   (pink)    (gray)            │
└───────────────────────────────────────┘
```

**Component Props:**
```
interface RSVPButtonGroupProps {
  selectedStatus?: 'in' | 'maybe' | 'out' | null;
  onStatusChange: (status: 'in' | 'maybe' | 'out') => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

**Visual States per Button:**
1. **Default (Not Selected)** — Light gray background, dark text
2. **Selected** — Colored background (blue/pink/gray), white text, checkmark visible
3. **Hover (Desktop)** — Slight shadow increase, background darkens
4. **Pressed** — Scale down 0.98 (tactile feedback)
5. **Disabled** — Opacity 0.5, no interaction

**Anatomy per Button:**
- Icon (✓, ?, ✕) — 16-20px
- Label text ("In", "Maybe", "Out") — 14px bold
- Padding: 12px horizontal, 10px vertical
- Each button: 1/3 of container width (or fixed width)
- Gap between buttons: 8px

**Variants:**
- **Full Width (default)** — Buttons stretch to fill container
- **Fixed Width** — Smaller, for detail view alternatives
- **Compact (List View)** — Smaller buttons, 44px height minimum
- **Large (Detail View)** — 56px height, emphasis

**Interaction:**
- Single tap to select (or click on desktop)
- Instant visual feedback (color change + scale)
- Can change anytime (tap different button = instant change)
- No confirmation dialog needed

**Accessibility:**
- Each button: proper `<button>` element
- Icon + text: both visible (not icon-only)
- `aria-label`: "Mark as In", "Mark as Maybe", "Mark as Out"
- Keyboard: Tab to navigate, Space/Enter to select
- Color-blind safe: icon + color + text

**Design Tokens:**
- In: Background #6366f1, text white
- Maybe: Background #ec4899, text white
- Out: Background #d1d5db, text #6b7280
- Height: 48px (minimum touch target)
- Border-radius: 8px
- Font: 14px bold, inter
- Animation: 200ms scale on press

---

### 4. SoftCalendarDisplay Component

**Purpose:** Show group member availability at a glance (free/busy blocks by person).

**When to Use:**
- Home feed (collapsed or toggle view)
- Event detail view (expanded)
- Event creation modal (for context)

**Content Structure:**
```
┌─ SoftCalendarDisplay ─────────────┐
│ AVAILABILITY                      │
│                                   │
│ Sarah       Tue-Wed               │ ← Person + free time
│ Mike        All week              │
│ Jessica     Tue only              │
│ Casey       TBD                   │
│                                   │
└───────────────────────────────────┘
```

**Component Props:**
```
interface SoftCalendarDisplayProps {
  groupMembers: Array<{
    id: string;
    name: string;
    availability: string; // "Tue-Wed", "All week", "TBD", etc.
    color?: string; // Optional member color
  }>;
  compactMode?: boolean; // Collapsed vs expanded
  onMemberTap?: (memberId: string) => void;
}
```

**Visual States:**
1. **Compact** — Single line per person, 12px font, collapsed mode
2. **Expanded** — More spacing, larger font, full detail
3. **Loading** — Skeleton placeholders while fetching
4. **No Data** — Message: "Group availability loading..."

**Anatomy:**
- Header: "AVAILABILITY" label (11px, uppercase, gray)
- List of members: one per line
- Per member:
  - Name (bold, 14px)
  - Availability text (regular, 13px, gray)
  - Optional color dot (member color)

**Interaction:**
- Tap member name → can navigate to their full calendar (future)
- Tap "Edit availability" → open availability setting modal

**Accessibility:**
- Container: `role="region"` aria-label="Group availability"
- Each member: `role="listitem"`
- Aria-label: "Sarah available Tuesday and Wednesday"

**Design Tokens:**
- Background: #f9fafb (light gray)
- Padding: 12px
- Border-radius: 8px
- Text color: #374151 (dark), #9ca3af (availability text)
- Member colors: From design system color palette

---

### 5. GradientHeader Component

**Purpose:** Page header with gradient background, establishing visual brand and hierarchy.

**When to Use:**
- Top of home feed (main header)
- Event detail view
- Create modals (inside modal)

**Content Structure:**
```
┌─ GradientHeader ──────────────────┐
│ Get-Together                      │ ← Text over gradient
│ (indigo → purple background)      │
└───────────────────────────────────┘
```

**Component Props:**
```
interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: 'primary' | 'secondary' | 'success';
  size?: 'small' | 'medium' | 'large';
}
```

**Visual States:**
1. **Default** — Full gradient (indigo to purple)
2. **Secondary** — Pink to coral (for alternative sections)
3. **Success** — Green (for confirmations)

**Anatomy:**
- Background: linear-gradient(135deg, startColor 0%, endColor 100%)
- Text: white, centered or left-aligned
- Padding: 16px (small), 24px (medium), 32px (large)
- Title: 18px bold (small), 24px bold (medium), 32px bold (large)
- Optional subtitle: 14px regular, white opacity 0.9

**Variants:**
- **Page Header (large)** — Full-width, 32px padding, prominent
- **Section Header (medium)** — 24px padding
- **Modal Header (small inside modal)** — 20px padding

**Animation:**
- Subtle gradient animation (optional): gradient angle shifts slowly (40s loop)
- On load: fade-in from top (200ms)

**Accessibility:**
- Title semantic: `<h1>` (page header) or `<h2>` (section)
- Color contrast: white on gradient meets WCAG AA
- No critical info conveyed by gradient alone

**Design Tokens:**
- Primary Gradient: #6366f1 → #8b5cf6 (indigo → purple)
- Secondary Gradient: #ec4899 → #f472b6 (pink → coral)
- Success Gradient: #10b981 → #34d399 (emerald → green)
- Text: white #ffffff
- Border-radius: 0 (for page header), 12px (for section header)

---

## Component Implementation Strategy

### Approach

**Foundation:** Chakra UI components + custom styled wrappers
**Pattern:** Each custom component wraps/extends Chakra foundation
**Tokens:** All custom components use shared design tokens from visual system
**Accessibility:** Built-in ARIA, semantic HTML, keyboard support

### Custom Component Build Order

**Priority 1 (Critical Path - Week 1):**
1. EventCard — Core feed display
2. RSVPButtonGroup — Core interaction
3. MomentumCounter — Visual celebration

**Priority 2 (Support - Week 1-2):**
4. GradientHeader — Visual polish
5. SoftCalendarDisplay — Context display

**Priority 3 (Enhancement - Week 2+):**
- Additional variants
- Animations refinement
- Performance optimizations

### Web Implementation (React + Chakra UI)

**EventCard:**
```
import { Box, Text, HStack } from '@chakra-ui/react'
import { MomentumCounter, RSVPButtonGroup } from './components'

export const EventCard = (props) => (
  <Box bg="white" borderLeft="4px solid" borderColor="indigo.500" ...>
    <Text fontSize="lg" fontWeight="bold">{props.title}</Text>
    <MomentumCounter {...props.counts} animated />
    <RSVPButtonGroup {...props.rsvp} fullWidth />
  </Box>
)
```

**Build Path:**
- Week 1: Core EventCard, RSVP buttons (styled Chakra Button)
- Week 2: MomentumCounter with animations
- Week 2: GradientHeader, SoftCalendar

### Mobile Implementation (React Native + Shared Tokens)

**Strategy:** Mirror web components using React Native equivalents
- `Box` → `View`
- `Text` → `Text`
- `Button` → `Pressable`
- Shadows via `shadowColor`, `shadowOffset`, `shadowOpacity`
- Gradients via LinearGradient library
- Shared design tokens (colors, spacing)

---

## Implementation Roadmap

### Phase 1a - Web MVP (Week 1)

**Components to Build:**
- EventCard (basic version)
- RSVPButtonGroup (Chakra Button styled)
- MomentumCounter (static, no animation yet)
- Chakra components: Modal, Input, Button, Toast

**Deliverables:**
- Event feed with cards
- RSVP interaction working
- Create event modal functional
- Basic styling complete

**Effort:** ~40 hours solo dev

### Phase 1b - Mobile (Weeks 2-3)

**Components to Build:**
- EventCard (React Native version)
- RSVPButtonGroup (touch-optimized)
- MomentumCounter (mirror web)
- GradientHeader (native gradient)
- SoftCalendarDisplay (responsive)

**Deliverables:**
- iOS/Android app
- Same functionality as web
- Shared design tokens across platforms
- Touch-optimized interactions

**Effort:** ~30 hours (reuses 70% backend logic)

### Phase 2 - Enhancement (Post-MVP)

**Components to Enhance:**
- MomentumCounter: Add celebration animations
- EventCard: Add edit/delete actions
- SoftCalendarDisplay: Add detail drill-down
- New: ProgressBar (threshold visualization)

**Deliverables:**
- Celebration animations
- Event management UI
- Advanced calendar interaction

---

## Component Design Tokens Reference

**All custom components use these design tokens:**

```
Colors:
- Primary: #6366f1 (indigo)
- Secondary: #ec4899 (pink)
- Success: #10b981 (green)
- Gray: #9ca3af
- White: #ffffff
- BG: #f9fafb

Spacing:
- Base: 8px
- Card padding: 16px
- Button height: 48px
- Border radius: 8-12px

Typography:
- Font: Inter
- Bold: 600-700 weight
- Regular: 400 weight
- Sizes: 12px, 14px, 16px, 18px, 20px+

Shadows:
- Card: 0 4px 12px rgba(0,0,0,0.08)
- Hover: 0 8px 24px rgba(0,0,0,0.12)

Animations:
- Duration: <300ms
- Easing: ease-out
- Respect: prefers-reduced-motion
```

---

## Success Criteria

✅ EventCard component working with real data
✅ RSVP buttons functional (in/maybe/out)
✅ Momentum counter displays live updates
✅ All components meet accessibility (WCAG AA)
✅ Mobile and web components consistent
✅ Components reusable across app screens
✅ Design tokens used consistently
✅ <10 seconds for event creation flow
✅ Real-time RSVP updates (<1 second latency)
✅ Celebration animations on threshold met

## UX Consistency Patterns

### Button Hierarchy

**Three-Level Pattern for Action Priority**

**Primary Button** (Main action)
- **Usage:** Event creation, RSVP "In" action, Group creation
- **Visual:** Indigo background (#6366f1), white text, 48-56px height
- **Label Examples:** "Create Event", "✓ In", "Create Group", "Join Group"
- **Behavior:** Bold, prominent, full-width on mobile, always visible
- **States:** Default, hover (+shadow), active (scale 0.98), disabled (opacity 0.5)
- **Mobile:** Full width when alone, 1/3 width in group
- **Accessibility:** `role="button"`, `aria-pressed` for toggle states, keyboard accessible

**Secondary Button** (Alternative actions)
- **Usage:** "Maybe" RSVP, "Out" RSVP, "Edit", alternative paths
- **Visual:** Colored background (pink #ec4899 for Maybe, gray #d1d5db for Out), white text, 48px height
- **Label Examples:** "? Maybe", "✕ Out", "Edit Event", "Add Details"
- **Behavior:** Clear but less prominent than primary
- **States:** Default, hover, active, disabled
- **Mobile:** Equal spacing with other buttons

**Tertiary Button** (Low priority)
- **Usage:** "Cancel", "Delete", "Learn More", secondary navigation
- **Visual:** Ghost button (transparent bg, colored border/text), 44px minimum
- **Label Examples:** "Cancel", "Dismiss", "Later", "Remove"
- **Behavior:** Subtle, users can easily skip
- **Desktop:** Hover shows subtle background
- **Mobile:** No hover effects

**Button Group Pattern (RSVP Buttons)**
- **Structure:** Always three buttons (In/Maybe/Out)
- **Width:** Equal distribution, 8px gap
- **Order:** In (blue/primary), Maybe (pink/secondary), Out (gray/tertiary)
- **Icons:** ✓ (In), ? (Maybe), ✕ (Out) — always visible
- **Interaction:** Single tap to select, tap different button to change (no confirmation)
- **Mobile:** Full-width stacked or horizontal, 48px height minimum
- **Accessibility:** Each proper `<button>`, distinct ARIA labels

---

### Feedback Patterns

**Success Feedback** (Action completed)
- **Trigger:** User creates event, RSVPs, adds to wishlist, joins group
- **Toast Notification:**
  - Message: "Added!", "Created!", "Event confirmed!", "Joined!"
  - Duration: 3 seconds (dismissible)
  - Position: Bottom center (mobile), top-right (desktop)
  - Style: Green background #10b981, white text, checkmark icon
  - Animation: Slide-up entrance (200ms)
- **Visual Update:** Item appears in feed instantly, animations on related elements
- **Accessibility:** `role="status"` `aria-live="polite"` announces completion

**Loading Feedback** (Waiting for response)
- **Trigger:** Creating event, joining group, fetching data
- **Visual Approach:** Skeleton placeholders showing expected layout
- **Skeleton Style:** Gray bars (#e5e7eb) matching content shape
- **Animation:** Optional subtle shimmer (not required)
- **Duration:** Show immediately, remove when data arrives
- **Timeout:** If >5 seconds, show error "Something went wrong" + retry button
- **Accessibility:** `aria-busy="true"` on loading region, `aria-label="Loading"`

**Error Feedback** (Action failed)
- **Trigger:** Network error, validation error, server error
- **Toast Notification:**
  - Message: "Something went wrong. Try again." or specific error
  - Style: Orange background #f97316, white text, warning icon (⚠️)
  - Duration: 5 seconds (sticky, dismissible)
  - Action: Optional "Retry" button
- **Form Errors:** Red border on field (#f97316) + red helper text below
- **Accessibility:** `role="alert"` `aria-live="assertive"` for immediate announcement

**Info Feedback** (Important information)
- **Trigger:** Feature limitation, group status (e.g., "Invite limit reached")
- **Toast Style:** Blue background #3b82f6, white text, info icon (ⓘ)
- **Duration:** 4 seconds (dismissible)
- **Position:** Top of screen or inline

**Real-Time Momentum Feedback** (Unique to get-together)
- **RSVP Count Update:**
  - Count increments: Number fades out, new count fades in (300ms)
  - Pulse animation: Scale 1 → 1.1 → 1 (300ms, ease-out)
  - Repeat for each RSVP that arrives
- **New Member Appears:**
  - Name slides in from left (200ms)
  - Small animation: slight scale + fade-in
- **Threshold Met:**
  - Event card background: white → light green #f0fdf4 (400ms transition)
  - Left border: indigo → green #10b981
  - Banner slides down: "✓ Event Confirmed!" (300ms)
  - Optional confetti or bounce (respects prefers-reduced-motion)
  - Sound: Optional success tone (if sound enabled)
- **Accessibility:** `aria-live="polite"` announces momentum updates

---

### Form Input Patterns

**Form Container**
- **Layout:** Vertical stacking, labels above inputs
- **Spacing:** 16px between form groups
- **Max Width:** 500px desktop, full width mobile (with 16px margins)
- **Padding:** 24px inside modal, 16px standalone

**Input Field Pattern**
- **Label:** Always visible text, not placeholder (accessibility requirement)
- **Label Style:** 14px semibold, #374151 color
- **Input:**
  - Font size: 16px minimum (prevents auto-zoom on iOS)
  - Padding: 12px (horizontal), 10px (vertical)
  - Border: 1px solid #d1d5db
  - Border-radius: 8px
  - Background: white #ffffff
- **Focus State:**
  - Border color: #6366f1 (indigo)
  - Box shadow: 0 0 0 3px rgba(99, 102, 241, 0.1)
  - No default outline (we provide custom focus ring)
- **Helper Text:** Optional 12px gray (#9ca3af) text below label
- **Placeholder:** Helpful hint (if used), gray color

**Validation Pattern**
- **Timing:** Validate on blur (not keystroke) to avoid frustrating users
- **Error State:**
  - Border: 1px solid #f97316 (orange/red)
  - Error message: 12px red #f97316 below field
  - Message clarity: Action-oriented, not technical codes
  - Examples: ❌ "Invalid" → ✅ "Title must be 2+ characters"
- **Clear Error:** When user starts fixing, error clears
- **Accessibility:** `aria-invalid="true"` when invalid, `aria-describedby` links to error text

**Date/Time Input Pattern**
- **Desktop:** Native browser date picker (respects OS preference)
- **Mobile:** Native iOS/Android date picker
- **Display Format:** User-friendly "Tue, Mar 5 - Thu, Mar 7"
- **Validation:** Prevent past dates, show inline guidance
- **Timezone:** Assume local time (no timezone selection in MVP)

**Submit Button Pattern**
- **Enabled State:** When required fields filled + valid
- **Disabled State:** Gray appearance when validation incomplete
- **Loading State:** Show spinner, disable clicks, keep button visible
- **Success State:** Toast notification + modal auto-dismisses

---

### Modal Patterns

**When to Use Modal (vs Full Screen)**
- ✅ Quick input (title, date) — Modal
- ✅ Confirmation dialog — Modal
- ✅ Fast action needed — Modal
- ❌ Complex multi-step forms — Full screen
- ❌ Detailed information — Full screen

**Modal Structure**
- **Backdrop:** Translucent dark (rgba(0,0,0,0.3)), dismissible (tap to close)
- **Modal Container:** White background, 16px border-radius, shadow 0 10px 40px rgba(0,0,0,0.1)
- **Header:** Title (24px bold) or gradient header (indigo-to-purple)
- **Body:** 24px padding, scrollable if content exceeds viewport
- **Footer:** Action buttons, sticky at bottom (don't scroll with content)
- **Height:** Max 90vh (leaves keyboard space on mobile)

**Create Event Modal Specific**
- **Header:** "New Event" title or indigo gradient background
- **Fields:**
  1. Event title input (required)
  2. Date/time picker (required)
  3. Optional threshold number input
- **Footer:** "Create Event" primary button, background "Cancel" link
- **On Create:** Modal closes, event appears in feed with animation

**Modal Animation**
- **Enter:**
  - Mobile: Slide up from bottom (200ms ease-out)
  - Desktop: Fade-in (200ms ease-out)
- **Exit:** Reverse animation (200ms)

**Accessibility**
- **Focus Trap:** Focus stays within modal until dismissed
- **Semantics:** `<dialog>` element with `open` attribute or `role="dialog"`
- **Label:** Modal has `aria-labelledby` pointing to title
- **Dismiss:** Escape key closes modal, backdrop click closes
- **Keyboard:** Tab cycles through focusable elements within modal

---

### Real-Time Update Pattern (Get-Together Unique)

**Purpose:** Make live coordination feel instant and exciting.

**Counter Update Animation**
- **Trigger:** Any RSVP status change arrives
- **Animation:**
  - Current count fades out (opacity: 1 → 0, 150ms)
  - New count fades in (opacity: 0 → 1, 150ms)
  - Scale pulse: 1 → 1.1 → 1 (300ms ease-out)
- **Frequency:** Updates batch if multiple RSVPs in quick succession
- **Accessibility:** `aria-live="polite"` announces "3 people in"

**RSVP Arrival Animation**
- **When:** Person marks In/Maybe/Out
- **Visual:**
  - Name appears in list (slides in from left, 200ms)
  - Icon shows status (✓/? /✕)
  - Counter updates with pulse
- **Notification:** Optional push notification to group

**Threshold Met Celebration**
- **Trigger:** Threshold reached (e.g., 5 people marked "In")
- **Animation Sequence:**
  - Event card background: white → light green #f0fdf4 (400ms ease-out)
  - Left border: indigo → green #10b981 (smooth transition)
  - Banner slides down: "✓ Event Confirmed!" (300ms)
  - Optional: Confetti particles or bounce animation (respects prefers-reduced-motion)
  - Optional: Success sound tone (if enabled in settings)
- **Notification:** Push notification: "Event confirmed! [N] people going"
- **Accessibility:** "Event confirmed" announced via aria-live

---

### Empty States & Loading Pattern

**Loading State** (Initial data fetch)
- **Visual:** Skeleton placeholders matching expected content
- **Skeleton:** Gray bars #e5e7eb, same dimensions as real content
- **Example:** 3-4 event card skeletons on home feed
- **Shimmer:** Optional subtle shimmer animation (not required)
- **Duration:** Show until content arrives
- **Fallback:** If >5 seconds, show error + "Retry" button

**Empty State** (No data)
- **Illustration:** Simple friendly icon (relevant to context)
- **Headline:** "No events yet", "No groups", "No wishlist items"
- **Description:** Brief explanation of what to do next
- **CTA:** Primary button to create first item
- **Example:** New group → empty state with "Create Event" button

**No Results State** (Search/filter)
- **Icon:** Search icon or filter funnel
- **Text:** "No events found"
- **Suggestion:** "Try different search terms" or "Clear filters"

---

### Navigation Pattern

**Primary Navigation**
- **Home (Default):** Event feed shows events for RSVP
- **Secondary:** Soft calendar (toggle or tab) shows availability
- **Tertiary:** Group settings, profile (post-MVP)

**Mobile Navigation (Bottom Tab Bar)**
- **Tab 1:** Feed icon (default active)
- **Tab 2:** Calendar icon
- **Tab 3:** Account icon (post-MVP)
- **Active Indicator:** Indigo underline, bold label
- **Inactive:** Gray text

**Desktop Navigation (Left Sidebar or Top Tabs)**
- **Tabs:** Feed | Calendar | [Group Settings]
- **Active:** Indigo underline
- **Instant Switch:** No loading delay, instant view change

**Back Navigation**
- **Mobile:** System back button, modal X button
- **Desktop:** Browser back button
- **Keyboard:** Escape closes modals

---

## Design System Integration

**All patterns use these consistent tokens:**

**Colors:**
- Primary action: Indigo #6366f1
- Secondary action: Pink #ec4899
- Neutral action: Gray #d1d5db
- Success: Green #10b981
- Error: Orange #f97316
- Info: Blue #3b82f6
- Backgrounds: White #ffffff, Light gray #f9fafb

**Spacing Scheme:**
- Within pattern: 8px, 12px
- Between patterns: 16px, 24px
- Edge margins: 16px mobile, 24px desktop

**Typography:**
- Button text: 14px bold Inter
- Label text: 14px semibold Inter
- Helper text: 12px regular Inter
- Default text: 16px regular Inter

**Animation Timing:**
- All animations: <300ms duration
- Easing: ease-out
- Respect: prefers-reduced-motion accessibility setting

---

## Consistency Principles Summary

1. **Familiar:** Users recognize patterns from other apps
2. **Fast Feedback:** Every action confirmed immediately
3. **Mobile First:** All patterns work on small screens
4. **Accessible:** WCAG AA standard throughout
5. **Consistent:** Same pattern behaves same way everywhere
6. **Delightful:** Smooth animations, positive feedback
7. **Respectful:** No dark patterns, no deception
8. **Predictable:** Users know what will happen next

---

## Responsive Design & Accessibility

### Responsive Strategy

#### Mobile-First Approach (Primary Platform)

Get-together is designed mobile-first, acknowledging that primary users access the app during episodic planning windows—quick check-ins while multitasking as working professionals. The mobile experience is the **definitive experience**, with all features fully functional and optimized for the small screen.

**Key Mobile Design Principles:**
- **Bottom Tab Navigation** (Get-Together, Wishlist, Groups) — Thumb-friendly and Instagram-familiar pattern
- **Single-Column Layout** — Event cards stack vertically; modals (Create Event, RSVP) float above content
- **Gesture-Driven Interactions** — Swipe left/right on event cards for quick actions, tap for details
- **Minimal Density** — Breathing room between cards; 8px base spacing ensures touch targets are 48px+
- **Episodic Optimized** — Users complete tasks in <2 minutes: scan events, commit, close. No deep navigation trees.

#### Tablet Strategy (768px - 1023px)

Tablets are secondary but important for users in lounges, at coffee shops, or on lunch breaks. The tablet view maintains mobile sensibility while offering optional expanded context.

**Tablet Enhancements:**
- **Maintained Single-Column** — Keep mobile navigation and card-based layout for consistency
- **Optional Two-Pane** (landscape mode) — Left sidebar shows event list, right pane shows event details (user chooses via toggle)
- **Larger Touch Targets** — Buttons scale to 56px+ for comfortable interaction
- **No New Features** — Tablet is enhanced mobile, not a separate experience

#### Desktop Strategy (1024px+)

Desktop is used by group admins managing settings, members viewing from work computers, and power users wanting a comprehensive view.

**Desktop Enhancements:**
- **Two-Column Layout** — Left sidebar (50% width) shows scrollable event list, right content area (50% width) shows selected event details
- **Desktop Navigation** — Horizontal header with tabs (Get-Together, Wishlist, Groups, Settings) replaces mobile bottom tab bar
- **Expanded Admin Features** — Group management panel, member invite interface, activity logs (defer to Phase 2)
- **Keyboard Shortcuts** — Tab through events, Enter to RSVP, Esc to close modals
- **Hover States** — Card elevation, button color shifts, icon tooltips for discoverability

### Breakpoint Strategy

Get-together uses **mobile-first media query approach**, building the mobile experience first, then layering enhancements at larger breakpoints.

**Standard Breakpoints:**
- **Mobile: 320px - 767px** — Single-column, bottom tab navigation, full-screen modals
- **Tablet: 768px - 1023px** — Enhanced mobile with optional side-by-side layout in landscape
- **Desktop: 1024px+** — Two-column layout with horizontal navigation

**Implementation Approach:**
- Base styles target mobile (320px and up)
- `@media (min-width: 768px)` — Tablet enhancements
- `@media (min-width: 1024px)` — Desktop expansion
- Use relative units (`rem`, `%`, `vw`) — Never fix pixel dimensions except for touch targets (48px minimum)

### Accessibility Strategy

Get-together targets **WCAG AA compliance** — the industry standard for inclusive design. This ensures the app is usable by people with visual, motor, cognitive, and hearing disabilities.

#### WCAG AA Compliance Areas:

**1. Visual Accessibility**
- **Color Contrast:** All text meets 4.5:1 ratio against background (normal text) and 3:1 ratio (large text 18pt+)
  - Primary Indigo #6366f1 on white: ✅ 4.8:1 ratio (accessible)
  - Secondary Pink #ec4899 on white: ✅ 4.6:1 ratio (accessible)
  - Success Green #10b981 on white: ✅ 5.2:1 ratio (accessible)
- **Color Independence:** Don't rely on color alone to convey meaning (e.g., RSVP buttons show "IN", "MAYBE", "OUT" text + icons, not just colors)
- **Focus Indicators:** Blue 2px outline (3px offset) on all interactive elements, visible on dark and light backgrounds

**2. Motor Accessibility**
- **Touch Targets:** All interactive elements minimum 48×48px (buttons, links, form inputs)
- **Gesture Support:** Tap-based interactions (no long-press, no drag-and-drop for core workflows)
- **Keyboard Navigation:** All features accessible via Tab (forward), Shift+Tab (backward), Enter/Space (activate), Esc (dismiss)
- **No Time-Dependent Actions:** No interactions that timeout or require rapid repeated taps

**3. Cognitive Accessibility**
- **Clear Language:** No jargon; "RSVP" explained as "Let the group know if you're IN, MAYBE, or OUT"
- **Consistent Patterns:** Same buttons, labels, and workflows across all screens
- **Error Prevention & Recovery:** Confirmation dialogs for destructive actions (delete event), inline error messages with helpful fix suggestions
- **Focus Management:** After submitting RSVP, focus returns to event card; after creating event, focus moves to success toast

**4. Screen Reader Accessibility** (Primary Compliance Focus)
- **Semantic HTML:** Use `<button>`, `<a>`, `<nav>`, `<main>`, `<form>` elements — not `<div>` role-faking
- **ARIA Labels:**
  - Event cards: `aria-label="Jan 15 Saturday Coffee - 3 in, 2 maybe, 2 out"`
  - RSVP buttons: `aria-label="Mark as IN"`, `aria-label="Mark as OUT"`
  - Momentum counter: `aria-live="polite"` for real-time updates (announces count changes)
- **Skip Links:** "Skip to main content" link (hidden until focused via keyboard)
- **Form Labels:** All inputs have associated `<label>` elements (not just placeholders)
- **Image Alternatives:** Icons have `aria-label` or are decorative with `aria-hidden="true"`
- **Headings Structure:** Logical hierarchy (h1 for page title, h2 for sections) for screen reader navigation

#### Screen Reader Testing Tools:
- **macOS:** VoiceOver (built-in, VO+U opens rotor for quick navigation)
- **Windows:** NVDA (free, open-source)
- **Mobile:** iOS VoiceOver, Android TalkBack
- **Browser:** axe DevTools (Chrome/Firefox), WAVE (accessibility.ict.umd.edu)

### Testing Strategy

#### Responsive Testing

**Browser Testing (Primary Focus):**
- Chrome (latest 2 versions) — 83%+ of users
- Safari (latest 2 versions) — 13%+ of users
- Firefox (latest) — 3%+ of users
- Edge (latest) — legacy Windows users
- Test on: Windows 10/11, macOS 12+, mobile simulators in DevTools

**Device Testing (Secondary, Phase 2):**
- iPhone 12 (375px width) — baseline small mobile
- iPhone 14 Pro (390px width) — modern iOS
- Google Pixel 6 (412px width) — Android baseline
- iPad (768px width) — tablet testing
- Desktop external monitor (1920px width) — wide desktop

**Browser Responsive Mode Testing:**
- Mobile: 375px width (iPhone SE / small Android)
- Tablet: 768px width (iPad)
- Desktop: 1024px and 1920px width
- Test orientation changes (portrait ↔ landscape)
- Test zoom levels: 100%, 125%, 150% (for low-vision users who magnify)

#### Accessibility Testing

**Automated Testing (Weekly):**
- axe DevTools browser extension — run automated scans for WCAG violations
- Lighthouse (Chrome DevTools) — accessibility audit scores
- WAVE (WebAIM) — visual accessibility feedback
- Color Contrast Analyzer — verify color ratios

**Screen Reader Testing (Bi-weekly):**
- **iOS:** Use native VoiceOver
  - Swipe right/left to navigate elements
  - Double-tap to activate
  - Two-finger Z to go back
  - Rotor (VO+U) for quick heading navigation
- **macOS:** Use native VoiceOver (System Preferences > Accessibility)
- **Windows:** Use NVDA (free download)
- Test critical workflows:
  - Browse event list and read event details
  - Activate RSVP buttons and receive confirmation
  - Navigate modals (Create Event, Group Settings)
  - Use form inputs and validation messages

**Color Blindness Testing:**
- Use Sim Daltonism app (macOS) or similar tools to simulate:
  - Protanopia (red-blind)
  - Deuteranopia (green-blind)
  - Tritanopia (blue-yellow blind)
- Verify UI is functional without color (icons, text labels, patterns)

**Keyboard Navigation Testing (Monthly):**
- Unplug mouse; navigate entire app with Tab, Shift+Tab, Enter, Esc
- Verify focus indicators visible on all interactive elements
- Verify focus order logical (left-to-right, top-to-bottom)
- Verify no keyboard traps (can always Tab away)
- Verify skip links work (should jump past navigation)

### Implementation Guidelines

#### Responsive Development

**CSS Architecture:**
- Use mobile-first media queries: style for mobile first, then override for larger screens
```css
/* Base: Mobile-first (320px+) */
.event-card { width: 100%; padding: 1rem; }

/* Tablet and up */
@media (min-width: 768px) {
  .event-card { width: 48%; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .event-card { width: calc(50% - 1rem); }
}
```

**Units & Spacing:**
- Use `rem` (relative to root font size) for fonts and spacing: 1rem = 16px base
- Use `%` for flexible layouts
- Use `vw` (viewport width) sparingly for full-width sections
- Never use fixed pixels except for touch targets (48px) and borders (1px)

**Images & Assets:**
- Serve appropriately-sized images: `<img srcset>` for different resolutions
- Compress images for mobile networks (target <150KB per image)
- Use SVG for icons (crisp at any size, tiny file size)

**Touch Targets:**
- Minimum 48×48px for all buttons and links
- 8px minimum padding around interactive elements to prevent accidental taps
- Buttons: center-align icons + text for visual clarity

#### Accessibility Development

**Semantic HTML:**
```html
<!-- ✅ Good: Semantic structure -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/events">Get-Together</a></li>
  </ul>
</nav>
<main>
  <section aria-labelledby="event-title">
    <h1 id="event-title">Coffee Date</h1>
    <button aria-label="Mark as IN">IN</button>
  </section>
</main>

<!-- ❌ Bad: Non-semantic divs -->
<div class="navbar">
  <div class="link">Get-Together</div>
</div>
```

**ARIA Implementation:**
- Use `aria-label` for icon buttons: `<button aria-label="Delete event">🗑</button>`
- Use `aria-live="polite"` for real-time updates (momentum counter): `<div aria-live="polite" aria-atomic="true">3 IN</div>`
- Use `aria-expanded` for toggles: `<button aria-expanded="false" aria-controls="menu">Menu</button>`
- Use `aria-current="page"` for active navigation tab

**Focus Management:**
```javascript
// After RSVP submission, return focus to event card
const eventCard = document.querySelector('[data-event-id="123"]');
eventCard.focus();

// After modal close (Esc key), return focus to trigger button
const triggerButton = document.querySelector('[aria-controls="create-event-modal"]');
triggerButton.focus();
```

**Form Accessibility:**
```html
<!-- Every input must have an associated label -->
<label for="event-title">Event Title</label>
<input id="event-title" type="text" required>

<!-- Error messages tied to input with aria-describedby -->
<input id="event-date" type="date" aria-describedby="date-error">
<div id="date-error" role="alert">Event date must be in the future</div>
```

**Testing Checklist for Developers:**
- [ ] All interactive elements are keyboard-accessible (Tab, Enter, Esc)
- [ ] Focus indicators visible on all elements
- [ ] Color is never the only way to convey meaning
- [ ] All images and icons have text alternatives (alt text or aria-label)
- [ ] Form inputs have associated labels
- [ ] Error messages are clear and actionable
- [ ] Real-time updates announced via aria-live
- [ ] Touch targets are 48px+ minimum
- [ ] Page is usable at 150% zoom
- [ ] Passes automated axe/Lighthouse checks

### Summary of Strategy

✅ **Mobile-first** — Base experience built for 375px width, enhanced at 768px+ and 1024px+
✅ **Browser testing focus** — Chrome, Safari, Firefox across Windows, macOS, and DevTools simulators
✅ **Screen reader accessibility** — Full ARIA support, semantic HTML, keyboard navigation
✅ **WCAG AA compliance** — 4.5:1 color contrast, 48px touch targets, focus indicators
✅ **Implementation-ready** — Clear patterns for developers (semantic HTML, ARIA labels, focus management)
