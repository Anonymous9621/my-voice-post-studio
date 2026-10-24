# Handoff: add paid Pro subscriptions to MyVoice AI

Read `AGENTS.md` first, along with `docs/SETUP.md`.

## Stack
- TanStack Start (React 19, Vite), running on Cloudflare Workers. Only use packages that run in Workers (fetch-based; the official `stripe` npm package works with `Stripe.createFetchHttpClient()`).
- The database, auth and storage run on Lovable Cloud (Supabase). Use the browser client from `@/integrations/supabase/client`. Auto-generated files under `src/integrations/` must not be edited.
- Pages go in `src/routes/` (signed-in pages under `src/routes/_authenticated/_app.*`). Never edit `src/routeTree.gen.ts`.

## What already exists
- `src/lib/plans.ts` defines plan limits. Free is 20 generations, 10 photo analyses and 2 writing styles. Pro is 300 generations, 150 photo analyses and 20 writing styles (confirmed by the owner). `getPlan(plan, status)` treats Pro as active only when the status is `active` or `trialing`.
- The `public.subscriptions` table has the columns `user_id`, `plan` ('free'|'pro'), `status` ('active'|'trialing'|'past_due'|'canceled'), `current_period_end`, `provider`, `provider_customer_id` and `provider_subscription_id`. Signed-in users can SELECT their own row and nothing more. Every user automatically gets a Free row when they sign up.
- Usage limits are already checked on the server in `src/lib/ai.functions.ts`. Updating a user's `subscriptions` row is all it takes to unlock Pro.

## Pro price
TODO (owner): fill in, e.g. USD 12/month and 99/year. Create the matching Stripe Price IDs and store them as `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY`.

## Work to build
1. **Checkout server function** (`src/lib/billing.functions.ts`, using `createServerFn` + `.middleware([requireSupabaseAuth])`). It creates a Stripe Checkout Session (`mode: "subscription"`) with `client_reference_id = userId` and `metadata.user_id`, reuses the customer stored in `provider_customer_id`, and returns the session URL. If the seller is in Thailand, include `automatic_tax: { enabled: true }`.
2. **Customer portal server function**, also authenticated. It creates a Stripe Billing Portal session for the user's customer and returns its URL. This is how customers cancel or update their card.
3. **Webhook** at `src/routes/api/public/stripe-webhook.ts`, using a `server.handlers.POST` route. Rules:
   - Read the raw body with `await request.text()` and verify the signature with `stripe.webhooks.constructEventAsync` and `STRIPE_WEBHOOK_SECRET`. Reject anything that fails.
   - Handle `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
   - Upsert the user's `subscriptions` row: set `plan='pro'` while the status is active/trialing, otherwise status `past_due`/`canceled` (getPlan then falls back to Free), plus `current_period_end` and the provider IDs.
   - Make the privileged write with `const { supabaseAdmin } = await import('@/integrations/supabase/client.server')` inside the handler, and only after the signature is verified.
   - Make it idempotent: repeated events must give the same result.
4. **UI changes:**
   - `src/routes/_authenticated/_app.settings.tsx`: an "Upgrade to Pro" button (calls checkout and redirects), or "Manage subscription" (portal) when the user is on Pro. Show the renewal date.
   - Wherever a `limit_reached` error appears (create page, style limit notice), add an upgrade link.
   - Add `/billing/success` and `/billing/cancel` return pages that refetch the `usage` query.
   - Use the existing design tokens and `Button` variants (`brand`, `outline`); don't hardcode colors.

## Security rules
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the price IDs belong in server environment variables only. Never use the `VITE_` prefix and never put them in browser code.
- Only the webhook writes to `subscriptions`. Do not add RLS policies that let users insert or update it.
- Never trust a plan or price sent from the client. Pick the price on the server from an allowed list.

## Database changes
Avoid them if you can, because the table already has every column you need. If one is truly necessary, write a new SQL file and ask the Lovable agent to apply it. Don't edit `drizzle/` metadata.

## Test checklist (Stripe test mode)
1. Upgrade with card 4242 4242 4242 4242. The webhook fires, Settings shows Pro and the limits show 300/150/20.
2. Cancel in the portal. After `customer.subscription.deleted`, the user is back on Free limits.
3. Use card 4000 0000 0000 0341 (payment fails), which should produce `past_due` and Free limits.
4. Send the webhook a request with a bad signature. It should return 400 and change nothing in the database.
5. Run `bunx vitest run`. Add tests for any new rules, for example how each Stripe status maps to a plan.
