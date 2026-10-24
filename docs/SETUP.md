# MyVoice AI — setup, testing and deployment

## Environment variables

All secrets are server-side only. Nothing secret is shipped to the browser.

| Variable | Required | Where it's used | Notes |
| --- | --- | --- | --- |
| `LOVABLE_API_KEY` | Yes, for AI | Server functions | Already provisioned by Lovable Cloud. Without it, AI features show "Requires configuration". |
| `AI_TEXT_MODEL` | No | Server | Overrides the writing model (default `openai/gpt-6-astra`). |
| `AI_VISION_MODEL` | No | Server | Overrides the photo-analysis model (defaults to `AI_TEXT_MODEL`). |
| `AI_GATEWAY_URL` | No | Server | Overrides the AI gateway base URL. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser | Public keys, managed automatically by Lovable Cloud. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Yes | Server | Managed automatically by Lovable Cloud. |

## What is stored where

- `profiles` — name, business, default language, onboarding status.
- `subscriptions` — plan (`free` / `pro`). Users can read but not change it.
- `style_profiles` — writing styles: samples + analysis.
- `generations` + `posts` — each brief and its three post variations.
- `usage_events` — one row per AI action, used for monthly limits.
- Storage bucket `product-images` (private) — uploaded product photos.

## Manual test checklist

1. Sign up with email (confirm via the email link) or Google / Lovable.
2. Onboarding: fill your name, paste 3+ of your posts separated by `---`, run the analysis.
3. Writing styles: rename, edit the profile, set as default, re-analyze, delete.
4. Create post: try My Voice and Natural, upload a photo, check the photo notes, generate.
5. Results: copy, edit, save, regenerate with a quick option, delete a variation.
6. Saved posts, History, Dashboard usage and Settings plan details should all update.

Automated tests: `bunx vitest run` (plan limits and routing).

## Deployment

Click **Publish** in Lovable. Database, storage and auth are already live in Lovable Cloud.
For Google sign-in with your own branding, add your own Google OAuth credentials in
Cloud → Users → Auth settings.

## Adding paid billing later

1. Add a payment provider and a webhook route under `src/routes/api/public/`.
2. In the webhook, verify the signature, then update the user's `subscriptions` row
   (`plan`, `status`, `current_period_end`, provider ids).
3. Adjust plan limits in `src/lib/plans.ts`. Server checks pick them up automatically.
