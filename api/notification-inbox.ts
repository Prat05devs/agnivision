import { authenticateDevice, isResponse, json } from "./_notificationHttp";
import { getInbox, markInboxRead } from "./_notificationStore";

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return json({}, 204);
    if (request.method !== "GET" && request.method !== "PATCH") return json({ error: "Method not allowed." }, 405);
    try {
      const device = await authenticateDevice(request);
      if (isResponse(device)) return device;
      if (request.method === "PATCH") {
        await markInboxRead(device.installationId);
        return json({ updated: true });
      }
      return json({ entries: await getInbox(device.installationId) });
    } catch {
      return json({ error: "Inbox is unavailable." }, 503);
    }
  },
};
