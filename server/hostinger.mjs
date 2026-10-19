// Hostinger starts a plain JavaScript entry file with `node`, so register tsx
// before loading the same TypeScript server that `npm run server:start` runs.
import { register } from "tsx/esm/api";

register();
const { startApiServer } = await import("./index.ts");
startApiServer();
