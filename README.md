# visPositions

A collection of open job positions in the visualization community.

## Daily digest runbook

The digest runs at 08:00 UTC: a Supabase scheduled function (`daily-digest-trigger`)
POSTs `/api/newsletter/daily-digest`, which emails a Resend broadcast and then posts
to the LinkedIn org page.

**If a digest does not go out:**

1. Check Resend → Broadcasts for a `Daily Digest <date>` left in **Draft**. The run
   creates the draft before sending it, so a draft means it died in between and
   nothing was emailed. Send it from the dashboard — the content is already correct.
2. Do **not** re-trigger the endpoint to recover. It is not idempotent: a second run
   creates a second broadcast. LinkedIn, being the last step, has to be posted by hand.
3. Look for the `[digest] <step> at +<n>ms` breadcrumbs in the Vercel logs to see which
   step was slow. Retention is short, so check promptly.

**Known failure mode:** `broadcasts.create` has been seen taking ~17s, which blew the
old 10s Vercel default. The route now sets `maxDuration: 60`.

**Monitoring:** set `DIGEST_HEARTBEAT_URL` to a dead-man's-switch check (Healthchecks.io,
Cronitor, …) configured to expect a daily ping and alert if one does not arrive. The
endpoint pings it after a successful send, including on quiet days with nothing to send.
Leaving the variable unset disables the ping. This is the only check that also catches
the scheduled function never firing at all.
