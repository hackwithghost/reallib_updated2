import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env["PORT"] || 3000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

const staticDir = path.resolve(__dirname, "public");
app.use("/reallib", express.static(staticDir));
app.get("/reallib/*", (_req, res) => {
  res.sendFile(path.resolve(staticDir, "index.html"));
});

app.listen(port, () => {
  logger.info({ port }, "Server listening");
  console.log(`\n  App: http://localhost:${port}/reallib/\n  API: http://localhost:${port}/api/reallib/\n`);
});
