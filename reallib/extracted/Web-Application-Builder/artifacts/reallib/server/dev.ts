import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import app from "./app";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reallibRoot = path.resolve(__dirname, "..");

const port = Number(process.env["PORT"] || 3000);

const vite = await createViteServer({
  root: reallibRoot,
  configFile: path.resolve(reallibRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "spa",
});

app.use(vite.middlewares);

app.listen(port, () => {
  logger.info({ port }, "Dev server running (API + Vite HMR)");
  console.log(`\n  App: http://localhost:${port}/reallib/\n  API: http://localhost:${port}/api/reallib/\n`);
});
