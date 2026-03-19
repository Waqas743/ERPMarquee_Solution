import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./server/routes";
import { initDatabase } from "./server/db";
import { startCronJobs } from "./server/services/cron";
import { initSocket } from "./server/services/socket";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await initDatabase();
  startCronJobs();
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize Socket.io
  initSocket(httpServer);
  
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
  app.use("/api", apiRoutes);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
