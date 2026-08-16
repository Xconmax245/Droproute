# DropRoute Hackathon Questionnaire

## 1. The Problem Being Solved
In the modern mobile landscape, user acquisition is fragmented across platforms like Twitter, TikTok, and Product Hunt. Traditional attribution tools (like AppsFlyer or Branch) are expensive and focus primarily on *installs* (vanity metrics) rather than *activations* (users who actually complete onboarding and get value). Furthermore, integrating these SDKs usually involves fragile regular expressions or complex manual native setup, which breaks builds and costs developers significant time. DropRoute solves this by providing a unified, real-time attribution pipeline with a zero-config, compiler-safe CLI.

## 2. Who Are the Users?
The primary users are indie hackers, startup founders, and mobile developers using the React Native / Expo Router ecosystem. These users need to launch quickly across multiple channels and instantly know which channel produces activated users, without spending days configuring complex attribution SDKs or paying enterprise SaaS fees.

## 3. Pricing Tiers & Path-to-Revenue
DropRoute operates on a freemium SaaS model designed to scale with an app's growth:
- **Free Tier:** Up to 1,000 tracked events per month. Includes standard AST CLI injection, basic attribution tracking (Installs & Activations), and 24-hour data retention. Perfect for hackathons and early-stage MVP validation.
- **Pro Tier ($19/mo):** Up to 50,000 tracked events per month. Unlocks the AI-powered Growth Recommendation Engine (Claude 3.5 Sonnet), real-time SSE dashboard streaming, unlimited data retention, and custom domain linking.
- **Scale Tier ($49/mo):** Up to 500,000 tracked events per month. Includes multi-step custom funnel tracking, automated Apple AASA and Android AssetLinks generation, and priority support.

**Path-to-Revenue:** We acquire users through the open-source CLI (which is free to install). As their apps scale and exceed 1,000 events/month, they organically hit the paywall. The $19/mo Pro Tier is priced aggressively to capture early-stage startups that need the AI Growth Engine.

## 4. Theme Fit Explanation
DropRoute fits the theme of "Developer Tooling & Automation" perfectly by demonstrating a novel approach to SDK integration. Instead of relying on fragile string replacements or regex, DropRoute uses **verifiable AST (Abstract Syntax Tree) code integration**. The CLI parses the target app's `_layout.tsx` into a semantic tree using the TypeScript compiler API (`ts-morph`), safely injects the deep-linking attribution logic, and verifies the build via a `--dry-run` mechanism before committing changes. This guarantees semantic correctness and zero build breakages.

## 5. YouTube Video Link
[Insert YouTube Video Link Here]
