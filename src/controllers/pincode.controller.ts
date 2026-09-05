import { Request, Response, NextFunction } from "express";
import { pool } from "../db/index.js";
import { cacheService } from "../cache/index.js";

interface PostalPincodeOfficeResponse {
  Name: string;
  Description: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string | null;
  State: string;
  Country: string;
  Pincode: string;
  Latitude?: number | null;
  Longitude?: number | null;
}

interface PostalPincodeApiResponse {
  Message: string;
  Status: "Success" | "Error";
  PostOffice: PostalPincodeOfficeResponse[] | null;
}

function mapToPostalResponse(row: any): PostalPincodeOfficeResponse {
  return {
    Name: row.office_name,
    Description: row.description || null,
    BranchType: row.branch_type,
    DeliveryStatus: row.delivery_status,
    Circle: row.circle,
    District: row.district,
    Division: row.division,
    Region: row.region,
    Block: row.block || null,
    State: row.state,
    Country: row.country || "India",
    Pincode: row.pincode,
    ...(row.latitude ? { Latitude: Number(row.latitude) } : {}),
    ...(row.longitude ? { Longitude: Number(row.longitude) } : {}),
  };
}

/**
 * GET /pincode/:pincode
 * Fully compatible with api.postalpincode.in response specification
 */
export async function getPincodeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pincode } = req.params;
    const cacheKey = `pincode:${pincode}`;

    // 1. Check Cache
    const cached = await cacheService.get<PostalPincodeApiResponse[]>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    // 2. Query PostgreSQL
    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const result = await client.query(
        `SELECT * FROM post_offices WHERE pincode = $1 ORDER BY office_name ASC`,
        [pincode]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    // 3. Format Response (api.postalpincode.in specification returns HTTP 200 with Status: "Error" on missing)
    let responseData: PostalPincodeApiResponse[];

    if (rows.length === 0) {
      responseData = [
        {
          Message: "No records found",
          Status: "Error",
          PostOffice: null,
        },
      ];
      // Cache missing records for 1 hour
      await cacheService.set(cacheKey, responseData, 3600);
      res.setHeader("X-Cache", "MISS");
      res.json(responseData);
      return;
    }

    responseData = [
      {
        Message: `Number of pincode(s) found:${rows.length}`,
        Status: "Success",
        PostOffice: rows.map(mapToPostalResponse),
      },
    ];

    // 4. Save to Cache
    await cacheService.set(cacheKey, responseData);

    res.setHeader("X-Cache", "MISS");
    res.json(responseData);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/pincode/:pincode
 * Modern RESTful endpoint with metadata and filtering
 */
export async function getPincodeV1(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pincode } = req.params;
    const { district, state, delivery_status } = req.query;

    const cacheKey = `v1:pincode:${pincode}:${district || ""}:${state || ""}:${delivery_status || ""}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const conditions: string[] = ["pincode = $1"];
    const params: any[] = [pincode];

    if (district) {
      params.push(String(district).toLowerCase());
      conditions.push(`LOWER(district) = $${params.length}`);
    }

    if (state) {
      params.push(String(state).toLowerCase());
      conditions.push(`LOWER(state) = $${params.length}`);
    }

    if (delivery_status) {
      params.push(delivery_status);
      conditions.push(`delivery_status = $${params.length}`);
    }

    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const query = `
        SELECT * FROM post_offices
        WHERE ${conditions.join(" AND ")}
        ORDER BY office_name ASC
      `;
      const result = await client.query(query, params);
      rows = result.rows;
    } finally {
      client.release();
    }

    const response = {
      status: "success",
      count: rows.length,
      pincode,
      data: rows.map(mapToPostalResponse),
    };

    await cacheService.set(cacheKey, response);
    res.setHeader("X-Cache", "MISS");
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/postoffice/:name
 * Search post offices and their pincodes by branch/office name
 */
export async function searchByOfficeName(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.params;
    const cacheKey = `office_search:${name.toLowerCase().trim()}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const result = await client.query(
        `SELECT * FROM post_offices 
         WHERE LOWER(office_name) LIKE $1 
         ORDER BY office_name ASC 
         LIMIT 50`,
        [`%${name.toLowerCase().trim()}%`]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    const response = [
      {
        Message: `Number of post office(s) found:${rows.length}`,
        Status: rows.length > 0 ? ("Success" as const) : ("Error" as const),
        PostOffice: rows.length > 0 ? rows.map(mapToPostalResponse) : null,
      },
    ];

    await cacheService.set(cacheKey, response);
    res.setHeader("X-Cache", "MISS");
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/state/:state/pincodes
 * List all pincodes in a state (e.g. Tamil Nadu)
 */
export async function getStatePincodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { state } = req.params;
    const cacheKey = `state_pincodes:${state.toLowerCase().trim()}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const result = await client.query(
        `SELECT pincode, district, count(*)::int as post_offices_count 
         FROM post_offices 
         WHERE LOWER(state) = $1 
         GROUP BY pincode, district 
         ORDER BY pincode ASC`,
        [state.toLowerCase().trim()]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    const response = {
      status: "success",
      state,
      total_pincodes: rows.length,
      pincodes: rows,
    };

    await cacheService.set(cacheKey, response);
    res.setHeader("X-Cache", "MISS");
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/state/:state/districts
 * List all districts in a state with post office counts
 */
export async function getStateDistricts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { state } = req.params;
    const cacheKey = `state_districts:${state.toLowerCase().trim()}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const result = await client.query(
        `SELECT district, count(DISTINCT pincode)::int as unique_pincodes, count(*)::int as total_post_offices 
         FROM post_offices 
         WHERE LOWER(state) = $1 
         GROUP BY district 
         ORDER BY district ASC`,
        [state.toLowerCase().trim()]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    const response = {
      status: "success",
      state,
      total_districts: rows.length,
      districts: rows,
    };

    await cacheService.set(cacheKey, response);
    res.setHeader("X-Cache", "MISS");
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/district/:district/pincodes
 * List all pincodes in a district
 */
export async function getDistrictPincodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { district } = req.params;
    const cacheKey = `district_pincodes:${district.toLowerCase().trim()}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json(cached);
      return;
    }

    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const result = await client.query(
        `SELECT pincode, count(*)::int as post_offices_count 
         FROM post_offices 
         WHERE LOWER(district) = $1 
         GROUP BY pincode 
         ORDER BY pincode ASC`,
        [district.toLowerCase().trim()]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    const response = {
      status: "success",
      district,
      total_pincodes: rows.length,
      pincodes: rows,
    };

    await cacheService.set(cacheKey, response);
    res.setHeader("X-Cache", "MISS");
    res.json(response);
  } catch (error) {
    next(error);
  }
}
