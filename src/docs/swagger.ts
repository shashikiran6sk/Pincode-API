export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "India Pincode Directory API",
    version: "1.0.0",
    description:
      "High-performance, production-ready backend API for Indian Postal PIN codes with up-to-date state and district bifurcations (including all 38 districts and 11,800+ post offices in Tamil Nadu, and 157,000+ across India), dual-tier caching (LRU + Redis), and API key authentication.",
    contact: {
      name: "Pincode API Support",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Standard API Key header (e.g. `pincode_dev_secret_key_12345`)",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Bearer token authentication with API Key",
      },
    },
    schemas: {
      PostOffice: {
        type: "object",
        properties: {
          Name: { type: "string", example: "Gandhinagar (Vellore)" },
          Description: { type: "string", nullable: true, example: null },
          BranchType: { type: "string", example: "Sub Post Office" },
          DeliveryStatus: { type: "string", example: "Delivery" },
          Circle: { type: "string", example: "Tamilnadu" },
          District: { type: "string", example: "Vellore" },
          Division: { type: "string", example: "Vellore" },
          Region: { type: "string", example: "Chennai Region" },
          Block: { type: "string", nullable: true, example: "Katpadi" },
          State: { type: "string", example: "Tamil Nadu" },
          Country: { type: "string", example: "India" },
          Pincode: { type: "string", example: "632006" },
          Latitude: { type: "number", nullable: true, example: 12.9698 },
          Longitude: { type: "number", nullable: true, example: 79.1384 },
        },
      },
      PostalPincodeResponse: {
        type: "array",
        items: {
          type: "object",
          properties: {
            Message: { type: "string", example: "Number of pincode(s) found:8" },
            Status: { type: "string", enum: ["Success", "Error"], example: "Success" },
            PostOffice: {
              type: "array",
              nullable: true,
              items: { $ref: "#/components/schemas/PostOffice" },
            },
          },
        },
      },
      RestPincodeResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
          count: { type: "integer", example: 8 },
          pincode: { type: "string", example: "632006" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/PostOffice" },
          },
        },
      },
      StateDistrictsResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
          state: { type: "string", example: "Tamil Nadu" },
          total_districts: { type: "integer", example: 38 },
          districts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                district: { type: "string", example: "Vellore" },
                unique_pincodes: { type: "integer", example: 51 },
                total_post_offices: { type: "integer", example: 261 },
              },
            },
          },
        },
      },
      StatePincodesResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
          state: { type: "string", example: "Tamil Nadu" },
          total_pincodes: { type: "integer", example: 2194 },
          pincodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pincode: { type: "string", example: "600001" },
                district: { type: "string", example: "Chennai" },
                post_offices_count: { type: "integer", example: 6 },
              },
            },
          },
        },
      },
      DistrictPincodesResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
          district: { type: "string", example: "Vellore" },
          total_pincodes: { type: "integer", example: 51 },
          pincodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pincode: { type: "string", example: "632006" },
                post_offices_count: { type: "integer", example: 15 },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "array",
        items: {
          type: "object",
          properties: {
            Message: { type: "string", example: "Invalid Pincode format. Must be a valid 6-digit Indian PIN code." },
            Status: { type: "string", example: "Error" },
            Details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "pincode" },
                  message: { type: "string", example: "Invalid Pincode format" },
                },
              },
            },
          },
        },
      },
      UnauthorizedResponse: {
        type: "object",
        properties: {
          Status: { type: "string", example: "Error" },
          Message: {
            type: "string",
            example: "Missing API Key. Please provide your API key in 'x-api-key' or 'Authorization: Bearer <key>' header.",
          },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "healthy" },
          timestamp: { type: "string", format: "date-time" },
          database: { type: "string", example: "connected" },
          cache: {
            type: "object",
            properties: {
              type: { type: "string", example: "Tiered (LRU + Redis)" },
              memoryItems: { type: "integer", example: 12 },
              maxItems: { type: "integer", example: 20000 },
              ttlSeconds: { type: "integer", example: 86400 },
              redisConnected: { type: "boolean", example: true },
            },
          },
        },
      },
    },
  },
  security: [
    { ApiKeyAuth: [] },
    { BearerAuth: [] },
  ],
  paths: {
    "/pincode/{pincode}": {
      get: {
        summary: "Lookup Pincode (PostalPincode.in Compatibility)",
        description:
          "Fetches all post offices and geographic details under the given 6-digit Indian PIN code. Compatible with the schema of api.postalpincode.in with updated district data.",
        parameters: [
          {
            name: "pincode",
            in: "path",
            required: true,
            description: "6-digit Indian Postal PIN code",
            schema: { type: "string", example: "632006", pattern: "^[1-9][0-9]{5}$" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response matching postalpincode.in schema",
            headers: {
              "X-Cache": {
                schema: { type: "string", enum: ["HIT", "MISS"] },
                description: "Indicates whether the response was served from cache",
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostalPincodeResponse" },
              },
            },
          },
          "400": {
            description: "Invalid Pincode Format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or Invalid API Key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/pincode/{pincode}": {
      get: {
        summary: "RESTful Pincode Lookup with Filtering",
        description: "Query post offices by pincode with optional query filters for district, state, or delivery status.",
        parameters: [
          {
            name: "pincode",
            in: "path",
            required: true,
            description: "6-digit Indian Postal PIN code",
            schema: { type: "string", example: "632006" },
          },
          {
            name: "district",
            in: "query",
            required: false,
            description: "Filter by district name (case-insensitive)",
            schema: { type: "string", example: "Vellore" },
          },
          {
            name: "state",
            in: "query",
            required: false,
            description: "Filter by state name (case-insensitive)",
            schema: { type: "string", example: "Tamil Nadu" },
          },
          {
            name: "delivery_status",
            in: "query",
            required: false,
            description: "Filter by delivery status",
            schema: { type: "string", enum: ["Delivery", "Non-Delivery"] },
          },
        ],
        responses: {
          "200": {
            description: "RESTful post office list with metadata",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RestPincodeResponse" },
              },
            },
          },
          "400": {
            description: "Invalid Parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/state/{state}/pincodes": {
      get: {
        summary: "Get All Pincodes in a State",
        description: "Returns all unique PIN codes in a given state (e.g. Tamil Nadu), along with district names and post office counts.",
        parameters: [
          {
            name: "state",
            in: "path",
            required: true,
            description: "State name (e.g. Tamil Nadu, Karnataka, Maharashtra)",
            schema: { type: "string", example: "Tamil Nadu" },
          },
        ],
        responses: {
          "200": {
            description: "List of all pincodes in the state",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatePincodesResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/state/{state}/districts": {
      get: {
        summary: "Get All Districts in a State",
        description: "Returns all 38 districts in Tamil Nadu (or any state) with their respective unique pincode and post office counts.",
        parameters: [
          {
            name: "state",
            in: "path",
            required: true,
            description: "State name (e.g. Tamil Nadu)",
            schema: { type: "string", example: "Tamil Nadu" },
          },
        ],
        responses: {
          "200": {
            description: "List of districts with stats",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StateDistrictsResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/district/{district}/pincodes": {
      get: {
        summary: "Get All Pincodes in a District",
        description: "Returns all PIN codes belonging to a given district (e.g. Vellore, Ranipet, Chennai).",
        parameters: [
          {
            name: "district",
            in: "path",
            required: true,
            description: "District name",
            schema: { type: "string", example: "Vellore" },
          },
        ],
        responses: {
          "200": {
            description: "List of pincodes in the district",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DistrictPincodesResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/postoffice/{name}": {
      get: {
        summary: "Search Post Offices by Name",
        description: "Search across India for post offices and their respective pincodes by branch or locality name.",
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            description: "Post office or branch name search term (minimum 2 characters)",
            schema: { type: "string", example: "Gandhinagar" },
          },
        ],
        responses: {
          "200": {
            description: "Matching post offices",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PostalPincodeResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/cache/stats": {
      get: {
        summary: "Cache Performance & Memory Metrics",
        description: "Get real-time statistics regarding L1 in-memory cache and L2 Redis connection.",
        responses: {
          "200": {
            description: "Cache Metrics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    Status: { type: "string", example: "Success" },
                    Cache: {
                      type: "object",
                      properties: {
                        type: { type: "string", example: "Tiered (LRU + Redis)" },
                        memoryItems: { type: "integer", example: 4 },
                        maxItems: { type: "integer", example: 20000 },
                        ttlSeconds: { type: "integer", example: 86400 },
                        redisConnected: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        summary: "Service Health Check Probe",
        description: "Unauthenticated health endpoint for probes, Kubernetes, and uptime monitoring.",
        security: [],
        responses: {
          "200": {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "503": {
            description: "System is unhealthy / Database unreachable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
  },
};
