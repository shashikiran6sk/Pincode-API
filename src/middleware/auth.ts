import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { config } from "../config/index.js";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * API Key authentication middleware
 * Accepts key via 'x-api-key' header or 'Authorization: Bearer <key>'
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const headerKey = req.header("x-api-key");
  const authHeader = req.header("authorization");

  let providedKey: string | undefined;

  if (headerKey) {
    providedKey = headerKey.trim();
  } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey) {
    res.status(401).json({
      Status: "Error",
      Message: "Missing API Key. Please provide your API key in 'x-api-key' or 'Authorization: Bearer <key>' header.",
    });
    return;
  }

  const isValid = config.API_KEYS.some((configuredKey) => safeCompare(providedKey!, configuredKey));

  if (!isValid) {
    res.status(401).json({
      Status: "Error",
      Message: "Invalid API Key. Access denied.",
    });
    return;
  }

  next();
}
