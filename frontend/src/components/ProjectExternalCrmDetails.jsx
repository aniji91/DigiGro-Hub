import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateProjectExternalCrms } from "../api/crmApi";
import { ExternalCrmIntegrationsEditor } from "./ExternalCrmIntegrationsEditor";

function integrationsFromProject(project) {
  return Array.isArray(project?.externalCrmIntegrations) ? project.externalCrmIntegrations : [];
}

export function ProjectExternalCrmDetails({ project, onSaved, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [integrations, setIntegrations] = useState(() => integrationsFromProject(project));

  useEffect(() => {
    if (!editing) {
      setIntegrations(integrationsFromProject(project));
    }
  }, [project, editing]);

  function cancelEdit() {
    setIntegrations(integrationsFromProject(project));
    setError("");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateProjectExternalCrms(project.id, integrations);
      onSaved?.(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`project-crm-details ${compact ? "project-crm-details--compact" : ""}`}>
      <div className="project-env-toolbar">
        {!compact && (
          <p className="muted project-env-hint">
            LeadSquared, Salesforce, Google Sheets, and other external CRM connections.
          </p>
        )}
        {!editing ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit integrations
          </button>
        ) : (
          <div className="project-env-actions">
            <button type="button" className="btn-secondary btn-sm" onClick={cancelEdit} disabled={saving}>
              <X size={14} /> Cancel
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <ExternalCrmIntegrationsEditor
        integrations={integrations}
        editing={editing}
        onChange={setIntegrations}
        compact={compact}
      />
    </div>
  );
}
