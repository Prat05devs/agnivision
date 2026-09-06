import notificationDispatchHandler from "../api/notification-dispatch";

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is required for notification dispatch.");
  }

  const response = await notificationDispatchHandler.fetch(
    new Request("https://internal.agnivision.invalid/api/notification-dispatch", {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    }),
  );
  const result = await response.text();
  if (!response.ok) {
    throw new Error(`Notification dispatch failed with HTTP ${response.status}.`);
  }
  console.log("Notification dispatch completed", result);
}

main().catch((error: unknown) => {
  console.error("Notification dispatch job failed", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
