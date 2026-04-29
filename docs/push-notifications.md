# Push Notifications Setup

This app uses Web Push for iPhone Home Screen PWA notifications.

## Required Vercel Environment Variables

Add these in Vercel project settings:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

`@upstash/redis` also accepts the Vercel KV names `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

## Generate VAPID Keys

After installing dependencies:

```bash
npm run generate:vapid
```

Store the printed values in Vercel env. Do not commit private keys.

## Notification Schedule

`vercel.json` defines five daily cron invocations. Cron uses UTC, so the schedules map to Turkey time as:

- `0 7 * * *` -> 10:00
- `0 10 * * *` -> 13:00
- `0 13 * * *` -> 16:00
- `0 16 * * *` -> 19:00
- `0 19 * * *` -> 22:00

## Message Selection

If the daily goal is not completed, every slot sends `streak_reminder`.

After the daily goal is completed, the app rotates between:

- `word_recall`
- `favorite_review`
- `daily_goal_nudge`

`weak_word_retry` is intentionally not used.
