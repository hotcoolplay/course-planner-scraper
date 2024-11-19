import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_ID,
  database: process.env.DB_NAME,
  password: process.env.DB_PWD,
  max: 20,
  idleTimeoutMillis: 30000,
});

export default pool;
