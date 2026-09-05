import { app } from "./app.js";
import { config } from "./config/index.js";
import { pool, checkDbHealth } from "./db/index.js";
import { cacheService } from "./cache/index.js";
import { runMigrations } from "./db/migrate.js";

async function startServer() {
  console.log("🚀 Initializing Pincode API server...");

  // Auto-run migrations on startup
  try {
    const isDbConnected = await checkDbHealth();
    if (isDbConnected) {
      await runMigrations();
    } else {
      console.warn("⚠️ Database connection not ready at startup. Migrations skipped. Ensure Postgres is running.");
    }
  } catch (err) {
    console.warn("⚠️ Database auto-migration warning:", err);
  }

  const server = app.listen(config.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🇮🇳  Pincode API Server is running on port ${config.PORT}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   Health Check: http://localhost:${config.PORT}/health`);
    console.log(`   Lookup Example: http://localhost:${config.PORT}/pincode/632006`);
    console.log(`   API Key header: x-api-key: ${config.API_KEYS[0]}`);
    console.log(`======================================================\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log("🔌 HTTP server closed.");
      await pool.end();
      console.log("🗄️ PostgreSQL pool closed.");
      await cacheService.close();
      console.log("⚡ Cache closed.");
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("💥 Failed to start server:", err);
  process.exit(1);
});
