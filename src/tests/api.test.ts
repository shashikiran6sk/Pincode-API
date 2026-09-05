import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pincodeParamSchema } from "../validators/pincode.validator.js";
import { cacheService } from "../cache/index.js";

const TEST_API_KEY = "pincode_dev_secret_key_12345";

describe("1. Pincode Validator Unit Tests", () => {
  it("should accept valid 6-digit Indian PIN codes", () => {
    expect(pincodeParamSchema.safeParse({ pincode: "632006" }).success).toBe(true);
    expect(pincodeParamSchema.safeParse({ pincode: "560095" }).success).toBe(true);
    expect(pincodeParamSchema.safeParse({ pincode: "110001" }).success).toBe(true);
  });

  it("should reject pincodes starting with 0", () => {
    const result = pincodeParamSchema.safeParse({ pincode: "012345" });
    expect(result.success).toBe(false);
  });

  it("should reject pincodes with fewer or more than 6 digits", () => {
    expect(pincodeParamSchema.safeParse({ pincode: "12345" }).success).toBe(false);
    expect(pincodeParamSchema.safeParse({ pincode: "1234567" }).success).toBe(false);
  });

  it("should reject non-numeric pincodes", () => {
    expect(pincodeParamSchema.safeParse({ pincode: "63200A" }).success).toBe(false);
    expect(pincodeParamSchema.safeParse({ pincode: "abcdef" }).success).toBe(false);
  });
});

describe("2. Authentication Middleware Tests", () => {
  it("should reject requests without an API key", async () => {
    const res = await request(app).get("/pincode/632006");
    expect(res.status).toBe(401);
    expect(res.body.Status).toBe("Error");
    expect(res.body.Message).toContain("Missing API Key");
  });

  it("should reject requests with an invalid API key", async () => {
    const res = await request(app)
      .get("/pincode/632006")
      .set("x-api-key", "wrong_key_123");
    expect(res.status).toBe(401);
    expect(res.body.Status).toBe("Error");
    expect(res.body.Message).toContain("Invalid API Key");
  });

  it("should allow requests with a valid x-api-key header", async () => {
    const res = await request(app)
      .get("/api/v1/cache/stats")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.Status).toBe("Success");
  });

  it("should allow requests with a valid Authorization: Bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/cache/stats")
      .set("Authorization", `Bearer ${TEST_API_KEY}`);
    expect(res.status).toBe(200);
    expect(res.body.Status).toBe("Success");
  });
});

describe("3. Cache Service Tests", () => {
  it("should store and retrieve data from the cache", async () => {
    const testKey = "unit:test:key";
    const testVal = { hello: "world" };

    await cacheService.set(testKey, testVal, 10);
    const cached = await cacheService.get(testKey);
    expect(cached).toEqual(testVal);

    await cacheService.del(testKey);
    const afterDel = await cacheService.get(testKey);
    expect(afterDel).toBeNull();
  });
});

describe("4. End-to-End Pincode Lookup Tests (PostalPincode.in Compatibility)", () => {
  it("GET /pincode/632006 returns exact structure and post offices with caching", async () => {
    // Invalidate cache first for test purity
    await cacheService.del("pincode:632006");

    // 1st request: Cache MISS
    const res1 = await request(app)
      .get("/pincode/632006")
      .set("x-api-key", TEST_API_KEY);

    expect(res1.status).toBe(200);
    expect(res1.headers["x-cache"]).toBe("MISS");
    expect(Array.isArray(res1.body)).toBe(true);
    expect(res1.body).toHaveLength(1);

    const data = res1.body[0];
    expect(data.Status).toBe("Success");
    expect(data.Message).toBe("Number of pincode(s) found:8");
    expect(Array.isArray(data.PostOffice)).toBe(true);
    expect(data.PostOffice).toHaveLength(8);

    // Verify fields inside PostOffice items
    const gandhinagar = data.PostOffice.find((p: any) => p.Name === "Gandhinagar (Vellore)");
    expect(gandhinagar).toBeDefined();
    expect(gandhinagar.Pincode).toBe("632006");
    expect(gandhinagar.District).toBe("Vellore");
    expect(gandhinagar.State).toBe("Tamil Nadu");
    expect(gandhinagar.Country).toBe("India");
    expect(gandhinagar.BranchType).toBe("Sub Post Office");
    expect(gandhinagar.DeliveryStatus).toBe("Delivery");

    // 2nd request: Cache HIT
    const res2 = await request(app)
      .get("/pincode/632006")
      .set("x-api-key", TEST_API_KEY);

    expect(res2.status).toBe(200);
    expect(res2.headers["x-cache"]).toBe("HIT");
    expect(res2.body).toEqual(res1.body);
  });

  it("GET /pincode/999999 returns 200 with error status when not found", async () => {
    const res = await request(app)
      .get("/pincode/999999")
      .set("x-api-key", TEST_API_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].Status).toBe("Error");
    expect(res.body[0].Message).toBe("No records found");
    expect(res.body[0].PostOffice).toBeNull();
  });
});

describe("5. RESTful V1 & Search Endpoints", () => {
  it("GET /api/v1/pincode/632006 with delivery_status filter", async () => {
    const res = await request(app)
      .get("/api/v1/pincode/632006?delivery_status=Delivery")
      .set("x-api-key", TEST_API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.pincode).toBe("632006");
    expect(res.body.count).toBeGreaterThan(0);
    for (const po of res.body.data) {
      expect(po.DeliveryStatus).toBe("Delivery");
    }
  });

  it("GET /api/v1/postoffice/Gandhinagar searches post offices by name", async () => {
    const res = await request(app)
      .get("/api/v1/postoffice/Gandhinagar")
      .set("x-api-key", TEST_API_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].Status).toBe("Success");
    expect(res.body[0].PostOffice.length).toBeGreaterThan(0);
  });
});

describe("6. System Health Check Endpoint", () => {
  it("should be publicly accessible and report database healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database).toBe("connected");
    expect(res.body.cache.redisConnected).toBe(true);
  });
});
