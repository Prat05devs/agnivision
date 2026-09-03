import { spawn } from "node:child_process";

import { getLocalFireDataUrl, startFirmsDevServer } from "./firms-dev-server";

async function run() {
  const port = Number(process.env.FIRMS_DEV_PORT ?? 8787);
  const server = await startFirmsDevServer(port);
  const fireDataUrl = getLocalFireDataUrl(port);

  console.log(`NASA FIRMS proxy ready at ${fireDataUrl}`);
  console.log("Starting Expo with the local proxy URL…");

  const expo = spawn(process.execPath, ["node_modules/expo/bin/cli", "start"], {
    env: {
      ...process.env,
      EXPO_PUBLIC_FIRE_DATA_URL: fireDataUrl,
      EXPO_PUBLIC_USE_MOCK_FIRE_DATA: "false",
    },
    stdio: "inherit",
  });

  function stop(exitCode = 0) {
    expo.kill("SIGTERM");
    server.close(() => process.exit(exitCode));
  }

  process.once("SIGINT", () => stop());
  process.once("SIGTERM", () => stop());
  expo.once("exit", (code) => {
    server.close(() => process.exit(code ?? 0));
  });
}

void run();
