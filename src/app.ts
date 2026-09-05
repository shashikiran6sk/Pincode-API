import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/index.js";
import { router as pincodeRouter } from "./routes/pincode.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkDbHealth } from "./db/index.js";
import { cacheService } from "./cache/index.js";

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: [
    {
      Message: "Too many requests from this IP, please try again later.",
      Status: "Error",
    },
  ],
});
app.use(limiter);

// Health check endpoint (public, unauthenticated for probes/monitoring)
app.get("/health", async (_req: Request, res: Response) => {
  const dbOk = await checkDbHealth();
  const cacheStats = cacheService.getStats();

  const isHealthy = dbOk;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbOk ? "connected" : "disconnected",
    cache: cacheStats,
  });
});

// Root welcome message
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "India Pincode Directory API",
    version: "1.0.0",
    docs: {
      lookup: "GET /pincode/:pincode (Headers: x-api-key)",
      rest_lookup: "GET /api/v1/pincode/:pincode (Headers: x-api-key)",
      search: "GET /api/v1/postoffice/:name (Headers: x-api-key)",
      cache_stats: "GET /api/v1/cache/stats (Headers: x-api-key)",
      health: "GET /health",
    },
  });
});

// Pincode routes
app.use(pincodeRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json([
    {
      Message: "Resource not found",
      Status: "Error",
    },
  ]);
});

// Global Error Handler
app.use(errorHandler);
