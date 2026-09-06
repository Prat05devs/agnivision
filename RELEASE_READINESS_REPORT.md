# AgniVision Android release readiness

Audit date: 2026-09-06 (Asia/Kolkata)

## Outcome

A signed Android release candidate was built from the current workspace as version `1.0.0` / version code `2` for package `live.agnivision.app`.

- Artifact: `artifacts/AgniVision-1.0.0-2-release.aab`
- Size: 57,883,068 bytes (approximately 55 MB)
- SHA-256: `980a7616b833227d1496c5dfe5a0e0b918f6da6cfbc62af7f64531ebc20562c5`
- JAR signature verification: passed
- Upload certificate SHA-1: `58:FE:2F:2C:53:55:15:E1:B4:89:51:47:2D:EC:A4:3E:A8:49:4D:6E`
- Target/compile SDK: 36; minimum SDK: 24
- Cleartext HTTP: disabled in the release manifest
- `SYSTEM_ALERT_WINDOW`: absent from the merged release manifest

This is a valid signed release candidate, but it is not yet approved as a production-ready store release because the production backend, push infrastructure, cloud restrictions, privacy declarations, and physical-device/Play Internal Testing remain external blockers.

## Credential audit

Known configured credential values were compared without printing their contents.

- Current source outside ignored environment/native-build folders: no exact matches.
- Reachable local Git history: no exact matches and no Google-key-shaped matches.
- Final AAB: all 1,366 entries scanned after extraction.
- FIRMS, Places, iOS Maps, cron, and Vercel credentials in AAB: zero matches.
- Android Maps key in AAB: one match, as required by Maps SDK for Android.
- A cross-platform configuration leak found during the audit (the iOS Maps key in the first Android candidate) was removed before the final AAB was rebuilt.

Android Maps keys are extractable by design. Before distribution, restrict this key in Google Cloud to Maps SDK for Android plus package `live.agnivision.app` and the certificate fingerprints that sign installed builds. The upload certificate is listed above; when Play App Signing is enabled, also configure the Play app-signing certificate shown in Play Console. Google documents these restrictions at <https://developers.google.com/maps/api-security-best-practices>.

The previously reported Vercel `.ts` path was rechecked. It returns normalized JSON data, not TypeScript source, and no known configured credential matched its response. `.env`, notification-store source, and server source probes returned 404.

Cloud-side key restrictions and prior revocation status cannot be proved from this repository. They must be confirmed in Google Cloud Console.

## Security and concurrency changes

- Coalesced simultaneous FIRMS refreshes, so one cold-cache wave performs one request per configured satellite source rather than one wave per user.
- Added a 30-second failure cooldown and retained stale-data fallback.
- Corrected upstream response-body timeout handling.
- Added 10-second timeouts for Places, Geocoding, Redis notification storage, and advisory storage.
- Prevented upstream Places errors from being reflected to clients.
- Bounded per-process rate-limit state and stopped trusting caller-controlled `X-Forwarded-For` directly.
- Added HTTP request/header/keep-alive timeouts and a 200-active-request overload guard to the portable Node server.
- Coalesced duplicate reverse-geocoding lookups and bounded its cache/concurrency.
- Coalesced SACHET refreshes.
- Made notification device registration/merge atomic in Redis and made inbox read updates non-destructive under concurrent delivery.
- Bounded notification registration reads to 25 at a time and notification delivery to 10 devices at a time.
- Disabled cleartext traffic and removed the release overlay permission.

## Verification evidence

- TypeScript strict check: passed.
- Automated tests: 47/47 passed.
- Synthetic concurrency: 100 simultaneous cold-cache FIRMS requests returned successfully and made exactly three upstream calls (one per source); 100 simultaneous failure requests were coalesced and immediate retries made no new upstream calls.
- Live low-impact smoke test against the currently configured endpoint: 25/25 HTTP 200; p50 399 ms, p95 441 ms, maximum 442 ms, total wall time 481 ms.
- Expo Doctor: 20/21. SDK package versions match. The only warning is that checked-in native folders and app config coexist; native values were reviewed and the actual release build passed.
- Android release build and release lint: passed.
- Final AAB signature: passed.
- Final AAB credential scan: passed under the distinction above for the required Android client key.
- npm audit: 17 moderate transitive advisories, no high or critical advisories. npm's proposed forced remediation downgrades React Navigation/Expo incompatibly, so it was not applied.

These tests demonstrate request coalescing and basic concurrent behavior; they do not establish a production capacity number. Capacity depends on the deployed CPU/memory/replica limits, Redis plan, Google/NASA/NDMA quotas, and edge throttling. A staged test against the actual production topology is still required before a user-count claim can be made.

## Remaining release blockers

1. The AAB still points to `https://agnivision.vercel.app` for fire data, and the other proxy URLs derive from that origin. The hardened `server/` implementation in this workspace is not deployed there. Deploy the reviewed backend to the approved production platform and rebuild with its HTTPS origin.
2. Confirm Android Maps API/application restrictions in Google Cloud, including the Play app-signing SHA-1 after Play App Signing enrollment.
3. Provision and verify Redis-compatible persistent storage, scheduled dispatch, Expo project ID, Android FCM configuration, and real push receipts if remote notifications ship enabled.
4. Complete Google Play Data Safety and privacy-policy disclosures for optional coarse location, push token, installation ID, notification preferences, watches, and inbox data.
5. Upload this candidate to Play Internal Testing and test on physical devices: fresh install/upgrade, map imagery, location denial/while-using/background paths, sharing, saved images, offline/stale behavior, notifications, process death, and multiple Android versions/form factors.
6. Confirm that Play Console has not already consumed version code `2`; if it has, increment the version code and rebuild.

No backend was deployed and no Play Console upload was performed during this audit.
