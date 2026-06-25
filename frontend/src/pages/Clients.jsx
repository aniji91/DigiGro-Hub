import CrmModulePage from "../components/CrmModulePage";
import { clientsApi } from "../api/crmApi";

const columns = [
  { key: "name", label: "Contact" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "industry", label: "Industry" },
  { key: "status", label: "Status", render: (v) => <span className="badge">{v}</span> },
];

const fields = [
  { name: "name", label: "Contact Name" },
  { name: "company", label: "Company" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "industry", label: "Industry" },
  { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Prospect"] },
];

export default function Clients() {
  return (
    <CrmModulePage
      title="Clients"
      subtitle="Manage client accounts and organizations"
      module="clients"
      api={clientsApi}
      columns={columns}
      fields={fields}
      emptyForm={{ name: "", company: "", email: "", phone: "", industry: "", status: "Active" }}
    />
  );
}
