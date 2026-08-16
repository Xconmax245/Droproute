# DropRoute — HackOnVibe Questionnaire

## Track

HackOnVibe Business Success track.

---

## What real, recurring problem does this solve?

Mobile app developers spend enormous effort on user acquisition (ads, influencer campaigns, referral programs) but have no idea which channels actually produce *activated* users — not just installs. It's trivially easy to get someone to tap a link and install an app. It's much harder to know that users from Twitter convert at 3× the rate of users from Facebook, so you should put Variant A's onboarding in front of Twitter users and Variant B in front of Facebook users.

Today, solving this requires: setting up a link shortener, integrating a mobile analytics SDK, writing server-side attribution logic, building a dashboard, and running A/B tests. That's weeks of engineering work. DropRoute does the whole thing in one command for any Expo Router app.

---

## Who are the users?

**Primary:** Indie mobile app developers and small teams (2–5 people) who launched an Expo Router app and are doing their first growth push. They have 0 engineering headcount to dedicate to attribution infrastructure.

**Secondary:** Bootstrapped SaaS founders who shipped a mobile companion app and want to attribute paid ad spend to actual user activation, not just installs.

---

## What does the working demo show?

1. An unmodified Expo Router app with clean git state
2. `droproute inject --dry-run` showing the exact AST diff that will be applied
3. `droproute inject` applying it — 3 files changed, attribution SDK wired, onboarding variant routing active
4. A generated referral link opened on a real device — app launches with source-specific onboarding copy
5. The app sending a real event to the server — visible live in the dashboard feed within ~1 second
6. The leaderboard showing activation rates by source (seeded + live data)
7. "Generate Recommendation" producing AI-derived advice from the actual numbers shown
8. `droproute rollback` restoring the project to bit-for-bit identical pre-injection state — verified with `git diff`

Every step is verifiable. No slide deck, no description of what "could" happen.

---

## Where is the meaningful AI?

Exactly two call sites, both deterministic inputs → structured outputs:

**AI call 1 (§5.1 — injection-point analysis):**
- Runs during `droproute inject`
- Input: the target app's `/app` file tree + contents of `_layout.tsx` + first screen
- Output: `{rootLayoutPath, firstScreenPath, hasExistingConditional, rationale}` — validated by zod, retried once on schema failure
- This directly gates which files the codemod modifies — it's not decorative

**AI call 2 (§5.2 — recommendation):**
- Triggered manually via the dashboard "Generate Recommendation" button
- Input: current activation score table (real Postgres rows)
- Output: 1-2 sentences comparing sources by actual numbers + one concrete suggested change
- Always labelled "Generated from live data · model name" — never presented as human-authored

The AI does not write code, does not self-modify, and does not generate marketing copy.

---

## Business model

**Revenue model:** Usage-based SaaS, charged to the developer, not the end user.

| Tier | Price | Limit |
|---|---|---|
| Free | $0 | 1 app, 500 attributed events/month |
| Indie | $29/month | 3 apps, 10,000 events/month |
| Team | $99/month | Unlimited apps, 100,000 events/month |
| Enterprise | Custom | Unlimited events, SLA, dedicated support |

**Path to first revenue:**
1. Launch on Product Hunt with the live demo video (the demo script is the launch video)
2. Target Expo Discord and r/reactnative — this is a tool developers already want, they just don't know it exists yet
3. First paying customer: any indie developer running paid ads who wants to know if they're wasting money

**Why this has legs:**
- The injection is a moat — it takes 30 seconds and produces a verifiable diff; a developer who runs this once and sees real data is unlikely to rebuild the equivalent from scratch
- The dashboard is a retention hook — daily check-ins to see if yesterday's campaign is activating users
- The referral link system creates network effects — every DropRoute-generated link that a real user shares is also a marketing impression for DropRoute

---

## What did you cut and why?

- **React Navigation support:** Out of scope by design — one framework, done well, beats two frameworks done halfway
- **User accounts / auth:** No auth on the demo dashboard; one less failure surface for a live demo
- **Retention-over-time metrics:** Requires multiple sessions over days — a live hackathon demo can't produce that data, so we don't build fake proxies for it
- **Self-patching / `droproute improve`:** The directive explicitly calls out that "AI self-optimizing code" is the wrong interpretation of the theme; we deliberately did not build this
- **Campaign builder / landing page generator:** Out of scope — the server's `/r/:code` fallback page is a single static HTML page, not a product
