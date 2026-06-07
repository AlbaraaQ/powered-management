import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// محاولة تحميل شهادة SSL إذا كانت موجودة
let sslConfig = undefined;
const caFile = path.join(process.cwd(), "ca.pem");

try {
  if (fs.existsSync(caFile)) {
    sslConfig = {
      ca: fs.readFileSync(caFile, "utf8"),
      rejectUnauthorized: true,
    };
    console.log("✅ SSL certificate loaded from ca.pem");
  } else {
    console.log("⚠️ ca.pem not found, using SSL without certificate validation");
    sslConfig = {
      rejectUnauthorized: false,
    };
  }
} catch (error) {
  console.log("⚠️ Error loading SSL certificate, using fallback");
  sslConfig = {
    rejectUnauthorized: false,
  };
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig,
  });

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);