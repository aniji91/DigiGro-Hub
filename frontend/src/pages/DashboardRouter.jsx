import { useAuth } from "../context/AuthContext";
import SuperAdminDashboard from "./dashboards/SuperAdminDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import HrDashboard from "./dashboards/HrDashboard";
import ProductManagerDashboard from "./dashboards/ProductManagerDashboard";
import EmployeeDashboard from "./dashboards/EmployeeDashboard";

export default function DashboardRouter() {
  const { user } = useAuth();

  if (user.role === "superadmin") return <SuperAdminDashboard />;
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "product_manager") return <ProductManagerDashboard />;
  if (user.role === "employee") return <EmployeeDashboard />;
  return <HrDashboard />;
}
