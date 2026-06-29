import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CrmLayout from "./layouts/CrmLayout";
import Login from "./pages/Login";
import DashboardRouter from "./pages/DashboardRouter";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import DailyWork from "./pages/DailyWork";
import Leaves from "./pages/Leaves";
import HolidayCalendar from "./pages/HolidayCalendar";
import TeamChat from "./pages/TeamChat";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Settings from "./pages/Settings";
import Announcements from "./pages/Announcements";
import ViewProjects from "./pages/ViewProjects";
import PmProjectBoard from "./pages/PmProjectBoard";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function ModuleRoute({ module, children }) {
  const { permissions } = useAuth();
  const allowed = Boolean(permissions[module]?.view);

  return (
    <ProtectedRoute checkAccess={() => allowed}>
      {allowed ? children : <div className="loading-state">Loading...</div>}
    </ProtectedRoute>
  );
}

function ViewProjectsRoute() {
  const { permissions, user } = useAuth();
  const canView =
    permissions.projects?.view ||
    permissions.myProjects?.view ||
    ["superadmin", "admin", "product_manager", "employee"].includes(user?.role);

  return (
    <ProtectedRoute checkAccess={() => canView}>
      <ViewProjects />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CrmLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardRouter />} />
            <Route path="clients" element={<ModuleRoute module="clients"><Clients /></ModuleRoute>} />
            <Route path="employees" element={<ModuleRoute module="employees"><Employees /></ModuleRoute>} />
            <Route path="projects" element={<ModuleRoute module="projects"><Projects /></ModuleRoute>} />
            <Route path="my-projects" element={<ViewProjectsRoute />} />
            <Route path="view-projects/:projectId?" element={<ViewProjectsRoute />} />
            <Route path="pm-board" element={<ModuleRoute module="projects"><PmProjectBoard /></ModuleRoute>} />
            <Route path="daily-work" element={<ModuleRoute module="workLogs"><DailyWork /></ModuleRoute>} />
            <Route path="leaves" element={<ModuleRoute module="leaves"><Leaves /></ModuleRoute>} />
            <Route path="holidays" element={<ModuleRoute module="holidays"><HolidayCalendar /></ModuleRoute>} />
            <Route path="announcements" element={<ModuleRoute module="announcements"><Announcements /></ModuleRoute>} />
            <Route path="chat" element={<ModuleRoute module="chat"><TeamChat /></ModuleRoute>} />
            <Route path="users" element={<ModuleRoute module="users"><Users /></ModuleRoute>} />
            <Route path="roles" element={<ModuleRoute module="roles"><Roles /></ModuleRoute>} />
            <Route path="settings" element={<ModuleRoute module="settings"><Settings /></ModuleRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
