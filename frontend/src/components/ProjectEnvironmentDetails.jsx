import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateProjectEnvironment } from "../api/crmApi";

const EMPTY_ENV = {
  siteUrl: "",
  domainDetails: "",
  hostingDetails: "",
  ftpDetails: "",
};

function envFromProject(project, key) {
  return { ...EMPTY_ENV, ...(project?.[key] || {}) };
}

function EnvField({ label, value, multiline = false }) {
  if (!value) {
    return (
      <div className="env-detail-row">
        <span>{label}</span>
        <strong className="muted">—</strong>
      </div>
    );
  }

  if (label.toLowerCase().includes("url")) {
    return (
      <div className="env-detail-row">
        <span>{label}</span>
        <strong>
          <a href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        </strong>
      </div>
    );
  }

  return (
    <div className={`env-detail-row ${multiline ? "env-detail-row--full" : ""}`}>
      <span>{label}</span>
      <strong className={multiline ? "pre-wrap" : ""}>{value}</strong>
    </div>
  );
}

function EnvironmentPanel({ title, envKey, env, editing, onChange }) {
  if (editing) {
    return (
      <div className="env-panel">
        <h4>{title}</h4>
        <div className="env-form">
          <label>
            {envKey === "stagingDetails" ? "Staging URL" : "Production URL"}
            <input
              type="url"
              value={env.siteUrl}
              onChange={(e) => onChange({ ...env, siteUrl: e.target.value })}
              placeholder="https://"
            />
          </label>
          <label>
            Domain details
            <textarea
              rows={3}
              value={env.domainDetails}
              onChange={(e) => onChange({ ...env, domainDetails: e.target.value })}
              placeholder="Registrar, DNS records, nameservers..."
            />
          </label>
          <label>
            Hosting details
            <textarea
              rows={3}
              value={env.hostingDetails}
              onChange={(e) => onChange({ ...env, hostingDetails: e.target.value })}
              placeholder="Provider, plan, control panel login notes..."
            />
          </label>
          <label>
            FTP details
            <textarea
              rows={3}
              value={env.ftpDetails}
              onChange={(e) => onChange({ ...env, ftpDetails: e.target.value })}
              placeholder="Host, username, port, path..."
            />
          </label>
        </div>
      </div>
    );
  }

  const urlLabel = envKey === "stagingDetails" ? "Staging URL" : "Production URL";

  return (
    <div className="env-panel">
      <h4>{title}</h4>
      <div className="env-detail-grid">
        <EnvField label={urlLabel} value={env.siteUrl} />
        <EnvField label="Domain details" value={env.domainDetails} multiline />
        <EnvField label="Hosting details" value={env.hostingDetails} multiline />
        <EnvField label="FTP details" value={env.ftpDetails} multiline />
      </div>
    </div>
  );
}

export function ProjectEnvironmentDetails({ project, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staging, setStaging] = useState(() => envFromProject(project, "stagingDetails"));
  const [production, setProduction] = useState(() => envFromProject(project, "productionDetails"));

  useEffect(() => {
    if (!editing) {
      setStaging(envFromProject(project, "stagingDetails"));
      setProduction(envFromProject(project, "productionDetails"));
    }
  }, [project, editing]);

  function cancelEdit() {
    setStaging(envFromProject(project, "stagingDetails"));
    setProduction(envFromProject(project, "productionDetails"));
    setError("");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateProjectEnvironment(project.id, {
        stagingDetails: staging,
        productionDetails: production,
      });
      onSaved?.(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="project-env-details">
      <div className="project-env-toolbar">
        <p className="muted project-env-hint">
          Staging and production access details for this project.
        </p>
        {!editing ? (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit details
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

      <div className="env-panels">
        <EnvironmentPanel
          title="Staging details"
          envKey="stagingDetails"
          env={staging}
          editing={editing}
          onChange={setStaging}
        />
        <EnvironmentPanel
          title="Production details"
          envKey="productionDetails"
          env={production}
          editing={editing}
          onChange={setProduction}
        />
      </div>
    </div>
  );
}
