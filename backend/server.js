require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { readData, dataPath, initDatabase, isMysqlEnabled } = require("./utils/jsonStore");
const { testConnection } = require("./db/pool");
const { syncAllEmployeeUsers } = require("./utils/employeeUsers");
const employeeRoutes = require("./routes/employees");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const clientRoutes = require("./routes/clients");
const projectRoutes = require("./routes/projects");
const leaveRoutes = require("./routes/leaves");
const leaveAllocationRoutes = require("./routes/leaveAllocations");
const dashboardRoutes = require("./routes/dashboard");
const myProjectRoutes = require("./routes/myProjects");
const workLogRoutes = require("./routes/workLogs");
const holidayRoutes = require("./routes/holidays");
const channelRoutes = require("./routes/channels");
const rolesRoutes = require("./routes/roles");
const projectOnboardingRoutes = require("./routes/projectOnboarding");
const announcementRoutes = require("./routes/announcements");
const projectUpdateRoutes = require("./routes/projectUpdates");
const { syncAllProjectsOnboarding } = require("./utils/projectOnboarding");
const { initLeaveAllocations } = require("./utils/leaveAllocationStore");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";

function resolveFrontendDist() {
  const candidates = [
    path.join(__dirname, "..", "frontend", "dist"),
    path.join(__dirname, "..", "dist"),
    path.join(process.cwd(), "frontend", "dist"),
    path.join(process.cwd(), "dist"),
  ];

  return candidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) || null;
}

const FRONTEND_DIST = resolveFrontendDist();

if (process.env.FRONTEND_URL) {
  app.use(cors({ origin: process.env.FRONTEND_URL }));
} else {
  app.use(cors());
}

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  const { isDatabaseReady, getCollectionCount } = require("./utils/jsonStore");
  res.json({
    ok: true,
    mysql: isMysqlEnabled(),
    dbReady: isDatabaseReady(),
    projects: getCollectionCount("projects"),
    workLogs: getCollectionCount("work_logs"),
    frontend: Boolean(FRONTEND_DIST),
    port: PORT,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-allocations", leaveAllocationRoutes);
app.use("/api/my-projects", myProjectRoutes);
app.use("/api/work-logs", workLogRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/project-onboarding", projectOnboardingRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/project-updates", projectUpdateRoutes);
app.use("/api/dashboard", dashboardRoutes);

if (FRONTEND_DIST) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "Employee Management API is running",
      hint: "Frontend build not found. Run npm run build.",
    });
  });
}

async function bootstrapData() {
  if (isMysqlEnabled()) {
    try {
      await testConnection();
      await initDatabase();
      const migrated = await initLeaveAllocations();
      if (migrated > 0) {
        console.log(`Migrated ${migrated} leave allocation(s) to leave_allocations table`);
      }
      console.log("Connected to MySQL database");
    } catch (err) {
      console.error("MySQL connection failed:", err.message);
      console.error("Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in environment variables.");
      throw err;
    }
  } else {
    console.log("Using local JSON files (set USE_MYSQL=true to use MySQL)");
  }

  const employees = readData(dataPath("employees.json"));
  await syncAllEmployeeUsers(employees);
  syncAllProjectsOnboarding();
  console.log(`Employee login accounts ready: ${employees.length}`);
}

async function startServer() {
  try {
    await bootstrapData();
  } catch (err) {
    console.error("Data bootstrap failed:", err.message);
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}${isProduction ? " (production)" : ""}`);
    if (FRONTEND_DIST) {
      console.log(`Serving frontend from ${FRONTEND_DIST}`);
    } else {
      console.warn("Frontend dist not found — API only mode");
    }
  });
}

startServer();
