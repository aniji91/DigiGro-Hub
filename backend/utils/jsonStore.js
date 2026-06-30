const fs = require("fs");
const path = require("path");
const { getPool, isMysqlEnabled } = require("../db/pool");

const cache = new Map();
let initialized = false;

function collectionKey(filePath) {
  return path.basename(filePath, ".json");
}

function readFileData(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function toIsoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
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

function assertDatabaseReady(action, key) {
  if (!initialized) {
    throw new Error(`Database not ready for ${action} on "${key}"`);
  }
}

async function restoreProjectsFromTableIfNeeded() {
  const cached = cache.get("projects");
  if (Array.isArray(cached) && cached.length > 0) return;

  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM projects ORDER BY id");
  if (!rows.length) return;

  const restored = rows.map((row) => ({
    id: row.id,
    name: row.name,
    clientName: row.client_name || "",
    clientId: row.client_id || null,
    description: row.description || "",
    status: row.status || "",
    startDate: toIsoDate(row.start_date),
    endDate: toIsoDate(row.end_date),
    assignedEmployeeIds: parseJsonColumn(row.assigned_employee_ids, []),
    ownerId: row.owner_id || null,
    projectType: row.project_type || null,
    existingSiteUrl: row.existing_site_url || "",
    referenceSites: parseJsonColumn(row.reference_sites, []),
    suggestions: row.suggestions || "",
    targetAudience: row.target_audience || "",
    pageScope: row.page_scope || "",
    techPreferences: row.tech_preferences || "",
    documents: parseJsonColumn(row.documents, []),
    stagingDetails: parseJsonColumn(row.staging_details, null),
    productionDetails: parseJsonColumn(row.production_details, null),
    externalCrmIntegrations: parseJsonColumn(row.external_crm_integrations, []),
    createdAt: row.created_at || null,
  }));

  cache.set("projects", restored);
  await persistCollection("projects", restored);
  console.log(`Restored ${restored.length} project(s) from projects table into app_collections`);
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
  const existingKeys = new Set();
  rows.forEach((row) => {
    existingKeys.add(row.collection_name);
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
      if (existingKeys.has(key)) continue;
      const data = readFileData(path.join(dataDir, file));
      cache.set(key, data);
      await persistCollection(key, data);
    }
  }

  await restoreProjectsFromTableIfNeeded();
  initialized = true;
  await syncProjectOwnersFromSeed();
  await syncSystemRolePermissionsFromSeed();
}

async function syncSystemRolePermissionsFromSeed() {
  if (!isMysqlEnabled()) return;

  const seedPath = path.join(__dirname, "..", "data", "roles.json");
  if (!fs.existsSync(seedPath)) return;

  const seed = readFileData(seedPath);
  const cached = cache.get("roles");
  if (!Array.isArray(cached) || !Array.isArray(seed)) return;

  const seedByKey = Object.fromEntries(seed.map((role) => [role.key, role]));
  let changed = false;
  const updated = cached.map((role) => {
    const seedRole = seedByKey[role.key];
    if (!seedRole?.isSystem || !seedRole.modulePermissions) return role;

    const merged = { ...role.modulePermissions, ...seedRole.modulePermissions };
    if (JSON.stringify(merged) === JSON.stringify(role.modulePermissions || {})) {
      return role;
    }

    changed = true;
    return { ...role, modulePermissions: merged };
  });

  if (changed) {
    cache.set("roles", updated);
    await persistCollection("roles", updated);
    console.log("Synced system role permissions from seed data");
  }
}

async function syncProjectOwnersFromSeed() {
  if (!isMysqlEnabled()) return;

  const seedPath = path.join(__dirname, "..", "data", "projects.json");
  if (!fs.existsSync(seedPath)) return;

  const seed = readFileData(seedPath);
  const cached = cache.get("projects");
  if (!Array.isArray(cached) || !Array.isArray(seed)) return;

  const seedOwners = Object.fromEntries(
    seed.filter((p) => p.ownerId).map((p) => [p.id, p.ownerId])
  );
  if (Object.keys(seedOwners).length === 0) return;

  let changed = false;
  const updated = cached.map((project) => {
    if (!project.ownerId && seedOwners[project.id]) {
      changed = true;
      return { ...project, ownerId: seedOwners[project.id] };
    }
    return project;
  });

  if (changed) {
    cache.set("projects", updated);
    await persistCollection("projects", updated);
    console.log("Synced project owner IDs from seed data");
  }
}

function readData(filePath) {
  const key = collectionKey(filePath);

  if (isMysqlEnabled()) {
    assertDatabaseReady("read", key);
    if (cache.has(key)) return cache.get(key);
    const empty = [];
    cache.set(key, empty);
    return empty;
  }

  return readFileData(filePath);
}

function writeData(filePath, data) {
  const key = collectionKey(filePath);

  if (isMysqlEnabled()) {
    assertDatabaseReady("write", key);
    cache.set(key, data);
    persistCollection(key, data).catch((err) => {
      console.error(`Failed to persist collection "${key}":`, err.message);
    });
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

function isDatabaseReady() {
  return !isMysqlEnabled() || initialized;
}

function getCollectionCount(key) {
  const data = cache.get(key);
  return Array.isArray(data) ? data.length : null;
}

module.exports = {
  readData,
  writeData,
  dataPath,
  nextId,
  initDatabase,
  isMysqlEnabled,
  isDatabaseReady,
  getCollectionCount,
};
