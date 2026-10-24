# Hand off MyVoice AI to another AI tool for the Pro subscription work

## How to give another AI access to the code
1. In Lovable, open the GitHub connection (the GitHub button at the top right of the editor) and connect the project to a GitHub repository.
2. Open that repository in the other AI tool, for example Cursor, Claude Code, Copilot or Codex.
3. Changes that tool pushes to the connected branch sync back into Lovable automatically. Keep the branch working and never force-push.

## What I will add so the other AI gets it right
A handoff guide, `docs/PRO_SUBSCRIPTION_HANDOFF.md`, that tells the other AI:
- The app's structure, and the rules already listed in `AGENTS.md`.
- Where plans and limits live: plan limits in `src/lib/plans.ts`, and each user's plan in the `subscriptions` table, which users can only read.
- The confirmed Pro limits: 300 generations, 150 photo analyses and 20 writing styles per month.
- The work to build:
  - A checkout page.
  - A secure webhook under `src/routes/api/public/` that checks it really comes from the payment provider, then updates `subscriptions` (plan, status, renewal date, provider IDs).
  - A "Manage subscription" option for cancelling or updating a card.
  - Upgrade buttons in Settings and next to the usage limits.
- Security rules: payment secret keys go in environment variables only, never in browser code, and only the server writes to `subscriptions`.
- The settings it will need: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, assuming the other AI uses your own Stripe account.
- A test checklist using Stripe's test mode.

## Limitations to know
- Lovable's built-in payments can't be set up from another tool. The other AI would need your own Stripe account and keys.
- Database changes it writes must be applied to Lovable Cloud. It should add new migration files, and I can apply them here.

## Pro price
Still needed. Add the price to the guide, or give it to the other AI directly.
