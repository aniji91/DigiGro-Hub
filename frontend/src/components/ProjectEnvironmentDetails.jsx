import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateProjectEnvironment } from "../api/crmApi";

const EMPTY_ENV = {
  siteUrl: "",
  domainDetails: "",
  hostingDetails: "",
  ftpDetails: "",
};

const ENV_FIELDS = [
  { key: "siteUrl", label: "URL", type: "url", full: true, placeholder: "https://" },
  {
    key: "domainDetails",
    label: "Domain details",
    type: "textarea",
    placeholder: "Registrar, DNS records, nameservers...",
  },
  {
    key: "hostingDetails",
    label: "Hosting details",
    type: "textarea",
    placeholder: "Provider, plan, control panel login notes...",
  },
  {
    key: "ftpDetails",
    label: "FTP details",
    type: "textarea",
    full: true,
    placeholder: "Host, username, port, path...",
  },
];

function envFromProject(project, key) {
  return { ...EMPTY_ENV, ...(project?.[key] || {}) };
}

function urlLabel(envKey) {
  return envKey === "stagingDetails" ? "Staging URL" : "Production URL";
}

function EnvFieldView({ label, value, multiline = false, isUrl = false }) {
  return (
    <div className={`env-field-view ${multiline ? "env-field-view--stacked" : ""}`}>
      <span className="env-field-label">{label}</span>
      <div className="env-field-value">
        {!value ? (
          <span className="muted">—</span>
        ) : isUrl ? (
          <a href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          <span className={multiline ? "pre-wrap" : ""}>{value}</span>
        )}
      </div>
    </div>
  );
}

function EnvFormFields({ envKey, env, onChange, compact = false }) {
  const textareaRows = compact ? 2 : 3;

  return (
    <div className="env-form-grid">
      {ENV_FIELDS.map((field) => {
        const label = field.key === "siteUrl" ? urlLabel(envKey) : field.label;
        const fieldClass = `env-field${field.full ? " env-field--full" : ""}`;

        if (field.type === "url") {
          return (
            <label key={field.key} className={fieldClass}>
              <span className="env-field-label">{label}</span>
              <input
                type="url"
                className="env-field-input"
                value={env[field.key]}
                onChange={(e) => onChange({ ...env, [field.key]: e.target.value })}
                placeholder={field.placeholder}
              />
            </label>
          );
        }

        return (
          <label key={field.key} className={fieldClass}>
            <span className="env-field-label">{label}</span>
            <textarea
              className="env-field-textarea"
              rows={textareaRows}
              value={env[field.key]}
              onChange={(e) => onChange({ ...env, [field.key]: e.target.value })}
              placeholder={field.placeholder}
            />
          </label>
        );
      })}
    </div>
  );
}

function EnvironmentPanel({ title, envKey, env, editing, onChange, compact = false }) {
  if (editing) {
    return (
      <div className="env-panel">
        <h4 className="env-panel-title">{title}</h4>
        <EnvFormFields envKey={envKey} env={env} onChange={onChange} compact={compact} />
      </div>
    );
  }

  return (
    <div className="env-panel">
      <h4 className="env-panel-title">{title}</h4>
      <div className="env-view-grid">
        <EnvFieldView label={urlLabel(envKey)} value={env.siteUrl} isUrl />
        <EnvFieldView label="Domain details" value={env.domainDetails} multiline />
        <EnvFieldView label="Hosting details" value={env.hostingDetails} multiline />
        <EnvFieldView label="FTP details" value={env.ftpDetails} multiline />
      </div>
    </div>
  );
}

export function ProjectEnvironmentDetails({ project, onSaved, compact = false }) {
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
    <div className={`project-env-details ${compact ? "project-env-details--compact" : ""}`}>
      <div className="project-env-toolbar">
        {!compact && (
          <p className="muted project-env-hint">
            Staging and production access details for this project.
          </p>
        )}
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
          title="Staging"
          envKey="stagingDetails"
          env={staging}
          editing={editing}
          onChange={setStaging}
          compact={compact}
        />
        <EnvironmentPanel
          title="Production"
          envKey="productionDetails"
          env={production}
          editing={editing}
          onChange={setProduction}
          compact={compact}
        />
      </div>
    </div>
  );
}
