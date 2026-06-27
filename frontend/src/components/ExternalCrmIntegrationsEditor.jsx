import { Plus, Trash2 } from "lucide-react";
import {
  EMPTY_EXTERNAL_CRM,
  EXTERNAL_CRM_FIELDS,
  EXTERNAL_CRM_PROVIDER_LABELS,
  EXTERNAL_CRM_PROVIDERS,
} from "../config/projectConfig";

function newIntegrationId() {
  return `crm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyExternalCrm() {
  return { ...EMPTY_EXTERNAL_CRM, id: newIntegrationId() };
}

function providerTitle(integration) {
  if (integration.label) return integration.label;
  return EXTERNAL_CRM_PROVIDER_LABELS[integration.provider] || integration.provider;
}

function integrationHasData(integration) {
  const { id, provider, ...fields } = integration;
  return Object.values(fields).some(Boolean);
}

function CrmFieldView({ field, value }) {
  const isUrl = field.type === "url";

  return (
    <div className="env-field-view">
      <span className="env-field-label">{field.label}</span>
      <div className="env-field-value">
        {!value ? (
          <span className="muted">—</span>
        ) : isUrl ? (
          <a href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : field.type === "textarea" ? (
          <span className="pre-wrap">{value}</span>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}

function CrmIntegrationCard({ integration, editing, onChange, onRemove, canRemove }) {
  const fields = EXTERNAL_CRM_FIELDS[integration.provider] || EXTERNAL_CRM_FIELDS.other;

  if (editing) {
    return (
      <div className="crm-integration-card">
        <div className="crm-integration-head">
          <label className="crm-provider-select">
            <span className="env-field-label">CRM / integration</span>
            <select
              value={integration.provider}
              onChange={(e) => onChange({ ...createEmptyExternalCrm(), id: integration.id, provider: e.target.value })}
            >
              {EXTERNAL_CRM_PROVIDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {canRemove && (
            <button type="button" className="flock-icon-btn crm-remove-btn" onClick={onRemove} title="Remove">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div className="env-form-grid">
          {fields.map((field) => (
            <label key={field.key} className="env-field env-field--full">
              <span className="env-field-label">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  className="env-field-textarea"
                  rows={field.key === "apiKey" ? 3 : 2}
                  value={integration[field.key] || ""}
                  onChange={(e) => onChange({ ...integration, [field.key]: e.target.value })}
                  placeholder={field.placeholder || ""}
                />
              ) : (
                <input
                  type={field.type === "url" ? "url" : "text"}
                  className="env-field-input"
                  value={integration[field.key] || ""}
                  onChange={(e) => onChange({ ...integration, [field.key]: e.target.value })}
                  placeholder={field.placeholder || ""}
                />
              )}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (!integrationHasData(integration)) return null;

  return (
    <div className="crm-integration-card crm-integration-card--view">
      <h5 className="crm-integration-title">{providerTitle(integration)}</h5>
      <div className="env-view-grid">
        {fields.map((field) => (
          <CrmFieldView key={field.key} field={field} value={integration[field.key]} />
        ))}
      </div>
    </div>
  );
}

export function ExternalCrmIntegrationsEditor({
  integrations = [],
  editing = true,
  onChange,
  compact = false,
}) {
  function updateIntegration(index, next) {
    onChange(integrations.map((item, i) => (i === index ? next : item)));
  }

  function removeIntegration(index) {
    onChange(integrations.filter((_, i) => i !== index));
  }

  function addIntegration() {
    onChange([...integrations, createEmptyExternalCrm()]);
  }

  const visibleIntegrations = editing
    ? integrations
    : integrations.filter(integrationHasData);

  return (
    <div className={`crm-integrations-editor ${compact ? "crm-integrations-editor--compact" : ""}`}>
      {visibleIntegrations.length === 0 && !editing && (
        <p className="muted crm-integrations-empty">No external CRM integrations added.</p>
      )}

      <div className="crm-integration-list">
        {visibleIntegrations.map((integration, index) => (
          <CrmIntegrationCard
            key={integration.id || index}
            integration={integration}
            editing={editing}
            onChange={(next) => updateIntegration(index, next)}
            onRemove={() => removeIntegration(index)}
            canRemove={integrations.length > 1 || integrationHasData(integration)}
          />
        ))}
      </div>

      {editing && (
        <button type="button" className="btn-secondary btn-sm crm-add-btn" onClick={addIntegration}>
          <Plus size={14} /> Add integration
        </button>
      )}
    </div>
  );
}
