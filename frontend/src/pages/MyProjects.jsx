import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyProjects } from "../api/crmApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import ProjectOnboardingPanel from "../components/ProjectOnboardingPanel";
import { ProjectBriefDetails } from "../components/ProjectBriefDetails";

export default function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: "name", label: "Project" },
    { key: "clientName", label: "Client" },
    { key: "status", label: "Status", render: (v) => <span className="badge">{v}</span> },
    {
      key: "onboarding",
      label: "Onboarding",
      render: (_, row) =>
        row.onboardingRequired ? (
          <span className="badge status-pending">Required</span>
        ) : (
          <span className="badge status-approved">Complete</span>
        ),
    },
    { key: "startDate", label: "Start" },
    { key: "endDate", label: "End" },
  ];

  async function load() {
    try {
      setError("");
      const data = await fetchMyProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleOnboardingUpdate(updated) {
    setViewing((prev) => (prev ? { ...prev, onboarding: updated, onboardingRequired: updated.status !== "completed" } : prev));
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updated.projectId
          ? { ...p, onboarding: updated, onboardingRequired: updated.status !== "completed" }
          : p
      )
    );
  }

  const pendingCount = projects.filter((p) => p.onboardingRequired).length;

  return (
    <>
      <PageHeader
        title="My Projects"
        subtitle="Projects assigned to you — complete onboarding before logging work"
      />
      {pendingCount > 0 && (
        <div className="alert warning">
          {pendingCount} project{pendingCount > 1 ? "s need" : " needs"} onboarding before you can log work.
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={projects}
          onView={(row) => setViewing(row)}
          canView
          canEdit={false}
          canDelete={false}
        />
      )}

      {viewing && (
        <Modal title="Project Details" onClose={() => setViewing(null)} size="xl">
          <ProjectBriefDetails project={viewing} />

          {viewing.onboarding && (
            <ProjectOnboardingPanel
              onboarding={viewing.onboarding}
              project={viewing}
              onUpdate={handleOnboardingUpdate}
            />
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
            <button
              type="button"
              className="btn-primary"
              disabled={viewing.onboardingRequired}
              onClick={() => {
                setViewing(null);
                navigate("/daily-work", { state: { projectId: viewing.id } });
              }}
            >
              {viewing.onboardingRequired ? "Complete Onboarding First" : "Log Today's Work"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
