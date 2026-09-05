import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { pool } from "./index.js";
import { runMigrations } from "./migrate.js";

export interface PostOfficeRecord {
  office_name: string;
  pincode: string;
  branch_type: string;
  delivery_status: string;
  circle: string;
  district: string;
  division: string;
  region: string;
  block: string | null;
  state: string;
  country?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Built-in curated dataset with updated state and district reorganizations
export const INITIAL_DATA: PostOfficeRecord[] = [
  // 632006 - Vellore District, Tamil Nadu (with updated details)
  {
    office_name: "Gandhinagar (Vellore)",
    pincode: "632006",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9698,
    longitude: 79.1384,
  },
  {
    office_name: "Gandhinagar East",
    pincode: "632006",
    branch_type: "Sub Post Office",
    delivery_status: "Non-Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9712,
    longitude: 79.1425,
  },
  {
    office_name: "Gandhinagar West",
    pincode: "632006",
    branch_type: "Sub Post Office",
    delivery_status: "Non-Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9675,
    longitude: 79.1310,
  },
  {
    office_name: "Jaffarapettai",
    pincode: "632006",
    branch_type: "Branch Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9810,
    longitude: 79.1450,
  },
  {
    office_name: "Kangeyanallur",
    pincode: "632006",
    branch_type: "Branch Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9554,
    longitude: 79.1482,
  },
  {
    office_name: "Senur",
    pincode: "632006",
    branch_type: "Branch Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9902,
    longitude: 79.1620,
  },
  {
    office_name: "Thandalam Krishnapuram",
    pincode: "632006",
    branch_type: "Branch Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9840,
    longitude: 79.1550,
  },
  {
    office_name: "Virudhambattu",
    pincode: "632006",
    branch_type: "Sub Post Office",
    delivery_status: "Non-Delivery",
    circle: "Tamilnadu",
    district: "Vellore",
    division: "Vellore",
    region: "Chennai Region",
    block: "Katpadi",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9610,
    longitude: 79.1290,
  },

  // Newly carved district: Ranipet (bifurcated from Vellore in 2019)
  {
    office_name: "Ranipet H.O",
    pincode: "632401",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Ranipet",
    division: "Arakkonam",
    region: "Chennai Region",
    block: "Walajah",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9229,
    longitude: 79.3323,
  },
  {
    office_name: "Walajapet S.O",
    pincode: "632513",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Ranipet",
    division: "Arakkonam",
    region: "Chennai Region",
    block: "Walajah",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.9300,
    longitude: 79.3800,
  },

  // Newly carved district: Tirupattur (bifurcated from Vellore in 2019)
  {
    office_name: "Tirupattur H.O",
    pincode: "635601",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Tirupattur",
    division: "Tirupattur",
    region: "Western Region",
    block: "Tirupattur",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.4950,
    longitude: 78.5678,
  },

  // Newly carved district: Chengalpattu (bifurcated from Kanchipuram in 2019)
  {
    office_name: "Chengalpattu H.O",
    pincode: "603001",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Chengalpattu",
    division: "Chengalpattu",
    region: "Chennai Region",
    block: "Chengalpattu",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 12.6841,
    longitude: 79.9836,
  },

  // Chennai
  {
    office_name: "Anna Nagar H.O",
    pincode: "600040",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Chennai",
    division: "Chennai City North",
    region: "Chennai Region",
    block: "Aminjikarai",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 13.0850,
    longitude: 80.2101,
  },
  {
    office_name: "T Nagar H.O",
    pincode: "600017",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Tamilnadu",
    district: "Chennai",
    division: "Chennai City South",
    region: "Chennai Region",
    block: "Mambalam",
    state: "Tamil Nadu",
    country: "India",
    description: null,
    latitude: 13.0418,
    longitude: 80.2341,
  },

  // Bengaluru - Karnataka
  {
    office_name: "Koramangala VI Block S.O",
    pincode: "560095",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Karnataka",
    district: "Bengaluru Urban",
    division: "Bangalore South",
    region: "Bengaluru HQ Region",
    block: "Bangalore South",
    state: "Karnataka",
    country: "India",
    description: null,
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    office_name: "Indiranagar H.O",
    pincode: "560038",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Karnataka",
    district: "Bengaluru Urban",
    division: "Bangalore East",
    region: "Bengaluru HQ Region",
    block: "Bangalore East",
    state: "Karnataka",
    country: "India",
    description: null,
    latitude: 12.9784,
    longitude: 77.6408,
  },

  // Hyderabad - Telangana (State accurately reflected, not old AP)
  {
    office_name: "Hitec City S.O",
    pincode: "500081",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Telangana",
    district: "Rangareddy",
    division: "Hyderabad South East",
    region: "Hyderabad City Region",
    block: "Serilingampally",
    state: "Telangana",
    country: "India",
    description: null,
    latitude: 17.4435,
    longitude: 78.3772,
  },
  {
    office_name: "Gachibowli S.O",
    pincode: "500032",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Telangana",
    district: "Rangareddy",
    division: "Hyderabad South East",
    region: "Hyderabad City Region",
    block: "Serilingampally",
    state: "Telangana",
    country: "India",
    description: null,
    latitude: 17.4401,
    longitude: 78.3489,
  },
  {
    office_name: "Hyderabad G.P.O.",
    pincode: "500001",
    branch_type: "General Post Office",
    delivery_status: "Delivery",
    circle: "Telangana",
    district: "Hyderabad",
    division: "Hyderabad City",
    region: "Hyderabad City Region",
    block: "Abids",
    state: "Telangana",
    country: "India",
    description: null,
    latitude: 17.3871,
    longitude: 78.4734,
  },

  // Andhra Pradesh (Updated newly bifurcated districts like Tirupati, NTR)
  {
    office_name: "Tirupati H.O",
    pincode: "517501",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Andhra Pradesh",
    district: "Tirupati",
    division: "Tirupati",
    region: "Kurnool Region",
    block: "Tirupati Urban",
    state: "Andhra Pradesh",
    country: "India",
    description: null,
    latitude: 13.6288,
    longitude: 79.4192,
  },
  {
    office_name: "Vijayawada H.O",
    pincode: "520001",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Andhra Pradesh",
    district: "NTR",
    division: "Vijayawada",
    region: "Vijayawada Region",
    block: "Vijayawada Urban",
    state: "Andhra Pradesh",
    country: "India",
    description: null,
    latitude: 16.5062,
    longitude: 80.6480,
  },

  // Mumbai - Maharashtra
  {
    office_name: "Nariman Point S.O",
    pincode: "400021",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Maharashtra",
    district: "Mumbai",
    division: "Mumbai City South",
    region: "Mumbai Region",
    block: "Mumbai",
    state: "Maharashtra",
    country: "India",
    description: null,
    latitude: 18.9256,
    longitude: 72.8242,
  },
  {
    office_name: "Bandra West S.O",
    pincode: "400050",
    branch_type: "Sub Post Office",
    delivery_status: "Delivery",
    circle: "Maharashtra",
    district: "Mumbai Suburban",
    division: "Mumbai City West",
    region: "Mumbai Region",
    block: "Bandra",
    state: "Maharashtra",
    country: "India",
    description: null,
    latitude: 19.0596,
    longitude: 72.8295,
  },

  // New Delhi
  {
    office_name: "Connaught Place H.O",
    pincode: "110001",
    branch_type: "Head Post Office",
    delivery_status: "Delivery",
    circle: "Delhi",
    district: "New Delhi",
    division: "New Delhi Central",
    region: "Delhi Region",
    block: "New Delhi",
    state: "Delhi",
    country: "India",
    description: null,
    latitude: 28.6304,
    longitude: 77.2177,
  }
];

export async function insertBatch(records: PostOfficeRecord[]) {
  if (records.length === 0) return;

  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO post_offices (
        office_name, pincode, branch_type, delivery_status,
        circle, district, division, region, block,
        state, country, description, latitude, longitude
      )
      SELECT * FROM UNNEST(
        $1::text[], $2::text[], $3::text[], $4::text[],
        $5::text[], $6::text[], $7::text[], $8::text[], $9::text[],
        $10::text[], $11::text[], $12::text[], $13::numeric[], $14::numeric[]
      )
      ON CONFLICT (pincode, office_name) DO UPDATE SET
        branch_type = EXCLUDED.branch_type,
        delivery_status = EXCLUDED.delivery_status,
        circle = EXCLUDED.circle,
        district = EXCLUDED.district,
        division = EXCLUDED.division,
        region = EXCLUDED.region,
        block = EXCLUDED.block,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        description = EXCLUDED.description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = CURRENT_TIMESTAMP;
    `;

    const office_names = records.map((r) => r.office_name);
    const pincodes = records.map((r) => r.pincode);
    const branch_types = records.map((r) => r.branch_type);
    const delivery_statuses = records.map((r) => r.delivery_status);
    const circles = records.map((r) => r.circle);
    const districts = records.map((r) => r.district);
    const divisions = records.map((r) => r.division);
    const regions = records.map((r) => r.region);
    const blocks = records.map((r) => r.block);
    const states = records.map((r) => r.state);
    const countries = records.map((r) => r.country || "India");
    const descriptions = records.map((r) => r.description || null);
    const latitudes = records.map((r) => r.latitude ?? null);
    const longitudes = records.map((r) => r.longitude ?? null);

    await client.query(query, [
      office_names,
      pincodes,
      branch_types,
      delivery_statuses,
      circles,
      districts,
      divisions,
      regions,
      blocks,
      states,
      countries,
      descriptions,
      latitudes,
      longitudes,
    ]);
  } finally {
    client.release();
  }
}

/**
 * Seed database from custom CSV file if provided, otherwise seed initial curated records
 */
export async function seedDatabase(csvFilePath?: string) {
  await runMigrations();

  if (csvFilePath && fs.existsSync(csvFilePath)) {
    console.log(`📁 Loading dataset from CSV: ${csvFilePath}`);
    const parser = fs.createReadStream(csvFilePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    let batch: PostOfficeRecord[] = [];
    let totalCount = 0;
    const BATCH_SIZE = 1000;

    for await (const row of parser) {
      // Handles both official data.gov.in columns and lowercase variants
      const record: PostOfficeRecord = {
        office_name: row.officename || row.OfficeName || row.office_name || row.Name || "",
        pincode: String(row.pincode || row.Pincode || "").padStart(6, "0"),
        branch_type: row.officetype || row.OfficeType || row.branch_type || row.BranchType || "Sub Post Office",
        delivery_status: row.deliverystatus || row.DeliveryStatus || row.delivery_status || "Delivery",
        circle: row.circlename || row.CircleName || row.circle || row.Circle || "",
        district: row.district || row.District || row.Districtname || "",
        division: row.divisionname || row.DivisionName || row.division || row.Division || "",
        region: row.regionname || row.RegionName || row.region || row.Region || "",
        block: row.taluk || row.block || row.Block || null,
        state: row.statename || row.StateName || row.state || row.State || "",
        country: "India",
        description: null,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
      };

      if (record.pincode.length === 6 && record.office_name) {
        batch.push(record);
        if (batch.length >= BATCH_SIZE) {
          await insertBatch(batch);
          totalCount += batch.length;
          console.log(`⚡ Inserted ${totalCount} records...`);
          batch = [];
        }
      }
    }

    if (batch.length > 0) {
      await insertBatch(batch);
      totalCount += batch.length;
    }
    console.log(`🎉 Seeding complete! Total ${totalCount} records imported.`);
  } else {
    console.log(`🌱 Seeding curated initial records (${INITIAL_DATA.length} post offices)...`);
    await insertBatch(INITIAL_DATA);
    console.log(`🎉 Seeding complete! ${INITIAL_DATA.length} post offices populated.`);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const fileArgIndex = process.argv.indexOf("--file");
  const filePath = fileArgIndex !== -1 ? process.argv[fileArgIndex + 1] : undefined;

  seedDatabase(filePath)
    .then(() => pool.end())
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      pool.end();
      process.exit(1);
    });
}
