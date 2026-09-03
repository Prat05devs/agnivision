# Agnivision Notification Implementation Note

## Decision

The notification system does not use Google Maps or either Maps API key. Google Maps is only a future presentation surface. Matching uses coordinates already held by the app and the existing normalized NASA FIRMS dataset. Notification taps currently open loaded detection details, or Activity when the referenced detection is no longer in the five-day local dataset.

Remote delivery uses `expo-notifications`, which provides one client API for Android FCM and iOS APNs through Expo Push Service. Registrations, preferences, watched destinations, coarse last-known locations, deduplication state, rolling caps, cooldowns, delivery tickets, and inbox entries are stored in Redis through its REST API.

## Implemented behavior

- Contextual notification permission request when the master toggle or first destination watch is enabled—not on first launch.
- Separate Android channels for High and standard Proximity/Destination alerts, plus Regional, Digest, and System channels; matching iOS categories are registered.
- Destination watches work with location permission Off and default to 25 km.
- Proximity radius options are 5/10/25/50 km; default is 10 km and Nominal+.
- “Always”, “While Using”, and “Off” location capability is rechecked whenever the app foregrounds.
- Background updates are deferred by distance/time and upload coordinates rounded to two decimal places. Continuous route history is never stored.
- The background location task runs only while both the master notification switch and Nearby detections are enabled; an existing Always grant is reused when the feature is re-enabled.
- New detections are aggregated by matching cycle. A detection is deduplicated per installation, with only Nominal-to-High escalation allowed.
- Quiet hours default to 10 PM–7 AM in device-local time. Only High personal alerts may use the user-controlled override.
- Per-category cooldowns, five Proximity pushes per rolling day (with the fifth converted to one calm summary), eight total pushes per rolling day, and at most two Regional events per UTC day are enforced server-side.
- All eligible events are written to the in-app inbox, including events held from push by quiet hours, cooldowns, or caps.
- Regional activity requires at least 15 detections, a complete seven-day stored baseline, and a 2.5× increase. Zero-count days are recorded for known regions, and the feature remains silent while the baseline warms up.
- Weekly digests wait for seven stored daily totals and are delivered Monday around 8 AM device-local time.
- Six consecutive ten-minute FIRMS failures produce one calm data-status notice for opted-in users.
- Expo delivery receipts are checked and invalid device tokens are retired.

## External prerequisites

Code alone cannot provision platform credentials. Production delivery still requires:

- an Expo/EAS project ID;
- Android FCM v1 credentials associated with the Android package;
- iOS APNs credentials and an Apple Developer account;
- Upstash Redis REST credentials;
- `CRON_SECRET` and a ten-minute production scheduler;
- a new native binary containing the installed notification/background-location modules.

The existing APK artifacts were deliberately not rebuilt or modified.

## Operational cautions

- The included ten-minute Vercel cron requires a Vercel plan supporting sub-daily schedules. On Hobby, use another authenticated scheduler or change the deployment plan.
- Regional labels use the repository’s offline reference-place index to group detections by the nearest known state/territory label. Before broad public rollout, replace this approximation with reviewed administrative boundary data.
- Test push permission denial, token refresh, Always/While Using/Off transitions, force-quit behavior, battery impact, and notification tap-through on physical Android and iOS devices before release.
