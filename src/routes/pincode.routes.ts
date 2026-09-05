import { Router } from "express";
import { apiKeyAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  pincodeParamSchema,
  postOfficeSearchSchema,
  filterQuerySchema,
} from "../validators/pincode.validator.js";
import {
  getPincodeDetails,
  getPincodeV1,
  searchByOfficeName,
  getStatePincodes,
  getStateDistricts,
  getDistrictPincodes,
} from "../controllers/pincode.controller.js";
import { cacheService } from "../cache/index.js";

export const router = Router();

// Apply API Key Authentication to all pincode routes
router.use(apiKeyAuth);

/**
 * @route   GET /pincode/:pincode
 * @desc    Get post offices by 6-digit PIN code (Compatible with api.postalpincode.in)
 */
router.get(
  "/pincode/:pincode",
  validate({ params: pincodeParamSchema }),
  getPincodeDetails
);

/**
 * @route   GET /api/v1/pincode/:pincode
 * @desc    RESTful endpoint with query filters (district, state, delivery_status)
 */
router.get(
  "/api/v1/pincode/:pincode",
  validate({ params: pincodeParamSchema, query: filterQuerySchema }),
  getPincodeV1
);

/**
 * @route   GET /api/v1/postoffice/:name
 * @desc    Search post offices by name/branch
 */
router.get(
  "/api/v1/postoffice/:name",
  validate({ params: postOfficeSearchSchema }),
  searchByOfficeName
);

/**
 * @route   GET /api/v1/state/:state/pincodes
 * @desc    Get all pincodes in a state (e.g. /api/v1/state/Tamil%20Nadu/pincodes)
 */
router.get("/api/v1/state/:state/pincodes", getStatePincodes);

/**
 * @route   GET /api/v1/state/:state/districts
 * @desc    Get all districts in a state with pincode and post office counts
 */
router.get("/api/v1/state/:state/districts", getStateDistricts);

/**
 * @route   GET /api/v1/district/:district/pincodes
 * @desc    Get all pincodes in a district (e.g. /api/v1/district/Vellore/pincodes)
 */
router.get("/api/v1/district/:district/pincodes", getDistrictPincodes);

/**
 * @route   GET /api/v1/cache/stats
 * @desc    Inspect caching metrics (L1 LRU & L2 Redis status)
 */
router.get("/api/v1/cache/stats", (_req, res) => {
  res.json({
    Status: "Success",
    Cache: cacheService.getStats(),
  });
});
