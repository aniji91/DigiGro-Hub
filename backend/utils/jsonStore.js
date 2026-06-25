const fs = require("fs");
const path = require("path");
const { getPool, isMysqlEnabled } = require("../db/pool");

const cache = new Map();
const persistQueue = new Map();
let persistTimer = null;
let initialized = false;

function collectionKey(filePath) {
  return path.basename(filePath, ".json");
}

function readFileData(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function persistCollection(key, data) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO app_collections (collection_name, data)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [key, JSON.stringify(data)]
  );
}

function queuePersist(key, data) {
  persistQueue.set(key, data);
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    const entries = [...persistQueue.entries()];
    persistQueue.clear();
    for (const [entryKey, entryData] of entries) {
      try {
        await persistCollection(entryKey, entryData);
      } catch (err) {
        console.error(`Failed to persist collection "${entryKey}":`, err.message);
      }
    }
  }, 25);
}

async function initDatabase() {
  if (!isMysqlEnabled() || initialized) return;

  const pool = getPool();
  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  const statements = sql
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  const [rows] = await pool.query("SELECT collection_name, data FROM app_collections");
  rows.forEach((row) => {
    cache.set(
      row.collection_name,
      typeof row.data === "string" ? JSON.parse(row.data) : row.data
    );
  });

  const dataDir = path.join(__dirname, "..", "data");
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(
      (file) => file.endsWith(".json") && file !== "leave_allocations.json"
    );
    for (const file of files) {
      const key = path.basename(file, ".json");
      if (cache.has(key)) continue;
      const data = readFileData(path.join(dataDir, file));
      cache.set(key, data);
      await persistCollection(key, data);
    }
  }

  initialized = true;
}

function readData(filePath) {
  const key = collectionKey(filePath);

  if (isMysqlEnabled()) {
    if (cache.has(key)) return cache.get(key);
    if (fs.existsSync(filePath)) {
      const data = readFileData(filePath);
      cache.set(key, data);
      queuePersist(key, data);
      return data;
    }
    const empty = [];
    cache.set(key, empty);
    return empty;
  }

  return readFileData(filePath);
}

function writeData(filePath, data) {
  const key = collectionKey(filePath);

  if (isMysqlEnabled()) {
    cache.set(key, data);
    queuePersist(key, data);
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function dataPath(filename) {
  return path.join(__dirname, "..", "data", filename);
}

function nextId(items) {
  return items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

module.exports = { readData, writeData, dataPath, nextId, initDatabase, isMysqlEnabled };
