const mysql = require("mysql2/promise");

let pool = null;

function isMysqlEnabled() {
  return process.env.USE_MYSQL === "true";
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "employee_managment_app",
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  };
}

function getPool() {
  if (!isMysqlEnabled()) {
    throw new Error("MySQL is not enabled. Set USE_MYSQL=true in .env");
  }
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

async function testConnection() {
  const connection = await getPool().getConnection();
  connection.release();
}

module.exports = { getPool, getDbConfig, isMysqlEnabled, testConnection };
