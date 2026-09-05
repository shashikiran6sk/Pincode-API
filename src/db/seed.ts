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
  country: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatBranchType(type: string): string {
  const t = (type || "").toUpperCase().trim();
  if (t === "BO" || t === "B.O" || t === "BRANCH POST OFFICE") return "Branch Post Office";
  if (t === "SO" || t === "S.O" || t === "SUB POST OFFICE") return "Sub Post Office";
  if (t === "HO" || t === "H.O" || t === "HEAD POST OFFICE") return "Head Post Office";
  if (t === "GPO" || t === "G.P.O" || t === "GENERAL POST OFFICE") return "General Post Office";
  return type || "Sub Post Office";
}

function formatDeliveryStatus(status: string): string {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("non")) return "Non-Delivery";
  return "Delivery";
}

function formatCircle(circle: string): string {
  let c = circle.replace(/Circle/i, "").trim();
  if (c.toLowerCase() === "tamil nadu" || c.toLowerCase() === "tamilnadu") {
    return "Tamilnadu";
  }
  return toTitleCase(c);
}

function formatState(state: string): string {
  const s = state.toUpperCase().trim();
  if (s === "TAMIL NADU" || s === "TAMILNADU") return "Tamil Nadu";
  if (s === "ANDHRA PRADESH") return "Andhra Pradesh";
  if (s === "TELANGANA") return "Telangana";
  if (s === "KARNATAKA") return "Karnataka";
  if (s === "KERALA") return "Kerala";
  if (s === "MAHARASHTRA") return "Maharashtra";
  if (s === "DELHI") return "Delhi";
  return toTitleCase(state);
}

export async function insertBatch(rawRecords: PostOfficeRecord[]) {
  if (rawRecords.length === 0) return;

  // Deduplicate within the batch to prevent PostgreSQL 21000 ON CONFLICT error
  const recordMap = new Map<string, PostOfficeRecord>();
  for (const r of rawRecords) {
    const key = `${r.pincode}__${r.office_name.toLowerCase().trim()}`;
    recordMap.set(key, r);
  }
  const records = Array.from(recordMap.values());

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
        $10::text[], $11::text[], $12::text[], $13::double precision[], $14::double precision[]
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
 * Seed database from CSV file.
 * If stateFilter is specified (e.g. "TAMIL NADU"), only rows matching that state are seeded.
 */
export async function seedFromCsv(csvFilePath: string, stateFilter?: string) {
  await runMigrations();

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  console.log(`📁 Loading dataset from CSV: ${csvFilePath}`);
  if (stateFilter) {
    console.log(`🔍 Filtering for state: ${stateFilter}`);
  }

  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  let batch: PostOfficeRecord[] = [];
  let totalCount = 0;
  const BATCH_SIZE = 2500;

  for await (const row of parser) {
    const rawState = row.StateName || row.statename || row.state || row.State || "";
    if (stateFilter && rawState.toUpperCase() !== stateFilter.toUpperCase()) {
      continue;
    }

    const officeName = (row.OfficeName || row.officename || row.Name || "").trim();
    const rawPincode = String(row.Pincode || row.pincode || "").trim();

    if (!officeName || !/^[1-9][0-9]{5}$/.test(rawPincode)) {
      continue;
    }

    const record: PostOfficeRecord = {
      office_name: officeName,
      pincode: rawPincode,
      branch_type: formatBranchType(row.OfficeType || row.officetype || row.branch_type || ""),
      delivery_status: formatDeliveryStatus(row.Delivery || row.deliverystatus || row.delivery_status || ""),
      circle: formatCircle(row.CircleName || row.circlename || row.circle || ""),
      district: toTitleCase(row.District || row.district || row.Districtname || ""),
      division: toTitleCase(row.DivisionName || row.divisionname || row.division || ""),
      region: toTitleCase(row.RegionName || row.regionname || row.region || ""),
      block: row.Taluk || row.taluk || row.block || row.Block ? toTitleCase(row.Taluk || row.taluk || row.block || row.Block) : null,
      state: formatState(rawState),
      country: "India",
      description: null,
      latitude: row.Latitude && !isNaN(parseFloat(row.Latitude)) ? parseFloat(row.Latitude) : null,
      longitude: row.Longitude && !isNaN(parseFloat(row.Longitude)) ? parseFloat(row.Longitude) : null,
    };

    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      totalCount += batch.length;
      console.log(`⚡ Ingested ${totalCount} post offices...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    totalCount += batch.length;
  }

  console.log(`🎉 Ingestion complete! Total ${totalCount} post offices populated in PostgreSQL.`);
  return totalCount;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const fileArgIndex = process.argv.indexOf("--file");
  const stateArgIndex = process.argv.indexOf("--state");

  const defaultCsvPath = path.join(path.dirname(new URL(import.meta.url).pathname), "../../data/pincodes.csv");
  const filePath = fileArgIndex !== -1 ? process.argv[fileArgIndex + 1] : defaultCsvPath;
  const stateFilter = stateArgIndex !== -1 ? process.argv[stateArgIndex + 1] : undefined;

  seedFromCsv(filePath, stateFilter)
    .then(() => pool.end())
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      pool.end();
      process.exit(1);
    });
}
