require("dotenv").config();

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

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
const isProduction = process.env.NODE_ENV === "production";

if (process.env.FRONTEND_URL) {
  app.use(cors({ origin: process.env.FRONTEND_URL }));
} else {
  app.use(cors());
}

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/my-projects", myProjectRoutes);
app.use("/api/work-logs", workLogRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/project-onboarding", projectOnboardingRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/project-updates", projectUpdateRoutes);
app.use("/api/dashboard", dashboardRoutes);

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({ message: "Employee Management API is running" });
  });
}

async function startServer() {
  if (isMysqlEnabled()) {
    await testConnection();
    await initDatabase();
    console.log("Connected to MySQL database");
  } else {
    console.log("Using local JSON files (set USE_MYSQL=true to use MySQL)");
  }

  const employees = readData(dataPath("employees.json"));
  await syncAllEmployeeUsers(employees);
  syncAllProjectsOnboarding();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}${isProduction ? " (production)" : ""}`);
    console.log(`Employee login accounts ready: ${employees.length}`);
    if (fs.existsSync(FRONTEND_DIST)) {
      console.log("Serving frontend from frontend/dist");
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
