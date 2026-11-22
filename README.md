# Vivah Studio

Vivah Studio is a responsive digital wedding invitation builder. It includes six invitation designs and a Royal Bengali experience with a GSAP curtain reveal, optional music, a wedding itinerary, and guest RSVP.

## Run locally

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. With no external credentials, the marketplace, interactive templates, and editor run in demo mode. Demo drafts are stored in the browser and uploaded media lasts for the current preview session. Demo checkout collects no money. Public links are available after a verified payment and publication.

## Connect Supabase

1. Copy `.env.example` to `.env.local`. Set your Supabase URL and publishable key and your server-only service role key. Generate `RSVP_RATE_LIMIT_SECRET` with `openssl rand -hex 32`.
2. Apply [all migrations in filename order](supabase/migrations) with the Supabase SQL editor or with `supabase db push` from a checkout linked to your Supabase project.
3. Enable email/password authentication. In the Supabase Auth settings, configure the site URL and SMTP. If email confirmation is enabled, set the Confirm Signup email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}`. Set the Reset Password email link to `{{ .SiteURL }}/auth/confirm?type=recovery&token_hash={{ .TokenHash }}`.
4. Assign administrators through Supabase Auth server-side by setting `app_metadata.role` to `admin` for the account. Admin access uses trusted Auth metadata. The app never reads a role from editable profile data.
5. Configure `NEXT_PUBLIC_SITE_URL` with the canonical origin and no trailing slash.

Drafts and guest replies are private. Publication copies the validated draft into a separate snapshot. The public route reads only snapshots and issues limited-duration signed media URLs. RSVP uses an hourly limit per invitation and platform IP. Locally, requests share a fallback bucket. In a deployment behind a proxy other than Vercel, adapt the RSVP route to use a verified client-IP header. Periodically remove expired buckets from `rsvp_limits`. View counts estimate visible browser sessions with JavaScript enabled. The public page renders without waiting for the analytics request. Photo uploads are resized, re-encoded and stripped of metadata before storage.

## Connect Razorpay

Set all three Razorpay variables from `.env.example`. Point Razorpay’s signed webhook at `/api/webhook` and subscribe to `payment.captured` and `payment.failed`. Configure payment capture in Razorpay. Use test keys in an isolated staging environment. Confirm the captured amount, order ID, and template match before publishing. The browser callback verifies its receipt on the server and reports the stored status. The signed server webhook records captured payments, and the database checks entitlement when it publishes. Apply the workflow retry migration before enabling the new webhook endpoint. Signed duplicates and late failure events cannot add another captured payment.

## Validate

```sh
npm run lint
npm run typecheck
npm run test:db
npm run build
npm run test:workflows
```

For browser tests, run `npx playwright install chromium`, start a server without service credentials, then run `npm run test:browser`. Set `TEST_BASE_URL` to use a different URL. The HTTP workflow test starts a production build against simulated Supabase endpoints to exercise request authentication, retry behavior, photo processing, and webhook signatures. The database test runs the migrations in embedded PostgreSQL with mock Supabase schemas and exercises RLS, draft revisions, snapshot isolation, payment gating, analytics, and RSVP rate limiting. Hosted Supabase authentication and Razorpay settlement require provider integration testing.

## Deploy

Push the validated `main` branch to `subhaJha/vivah-studio-`. In the existing Vercel project `vivah-studio`, confirm the Git connection and configure the environment variables before a production deployment. Use the Next.js preset with the repository root as the root directory. After the build succeeds, verify the marketplace, editor, preview, and authenticated and public invitation routes. Keep Vercel authentication disabled for published guest URLs if guests need anonymous access.

The sample couple photo was generated for Vivah Studio. The example invitation and testimonial use fictional content.
