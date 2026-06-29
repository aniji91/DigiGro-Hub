export const PROJECT_TYPES = [
  { value: "website_creation", label: "Website Creation" },
  { value: "website_redesign", label: "Website Redesign" },
  { value: "web_application", label: "Web Application" },
  { value: "landing_page", label: "Landing Page" },
  { value: "other", label: "Other" },
];

export const PROJECT_TYPE_LABELS = Object.fromEntries(
  PROJECT_TYPES.map((type) => [type.value, type.label])
);

export const EMPTY_REFERENCE_SITE = { label: "", url: "" };

export const EMPTY_PROJECT = {
  name: "",
  clientId: "",
  clientName: "",
  description: "",
  status: "Planning",
  startDate: "",
  endDate: "",
  assignedEmployeeIds: [],
  ownerId: "",
  projectType: "website_creation",
  existingSiteUrl: "",
  referenceSites: [{ label: "", url: "" }],
  suggestions: "",
  targetAudience: "",
  pageScope: "",
  techPreferences: "",
  documents: [],
  externalCrmIntegrations: [],
};

export const EXTERNAL_CRM_PROVIDERS = [
  { value: "leadsquared", label: "LeadSquared (LSQ)" },
  { value: "salesforce", label: "Salesforce" },
  { value: "google_sheets", label: "Google Sheets" },
  { value: "hubspot", label: "HubSpot" },
  { value: "zoho", label: "Zoho CRM" },
  { value: "other", label: "Other" },
];

export const EXTERNAL_CRM_PROVIDER_LABELS = Object.fromEntries(
  EXTERNAL_CRM_PROVIDERS.map((p) => [p.value, p.label])
);

export const EMPTY_EXTERNAL_CRM = {
  id: "",
  provider: "leadsquared",
  label: "",
  apiUrl: "",
  apiKey: "",
  accessKey: "",
  secretKey: "",
  clientId: "",
  clientSecret: "",
  accessToken: "",
  refreshToken: "",
  webhookUrl: "",
  spreadsheetUrl: "",
  spreadsheetId: "",
  instanceUrl: "",
  username: "",
  securityToken: "",
  portalId: "",
  notes: "",
};

export const EXTERNAL_CRM_FIELDS = {
  leadsquared: [
    { key: "apiUrl", label: "API host / base URL", type: "url", placeholder: "https://api-in21.leadsquared.com" },
    { key: "accessKey", label: "Access key", type: "text" },
    { key: "secretKey", label: "Secret key", type: "text" },
    { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "Optional webhook endpoint" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Lead capture rules, list IDs, etc." },
  ],
  salesforce: [
    { key: "instanceUrl", label: "Instance URL", type: "url", placeholder: "https://yourorg.my.salesforce.com" },
    { key: "clientId", label: "Consumer key / Client ID", type: "text" },
    { key: "clientSecret", label: "Client secret", type: "text" },
    { key: "username", label: "Username", type: "text" },
    { key: "securityToken", label: "Security token", type: "text" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Object mappings, sandbox info..." },
  ],
  google_sheets: [
    { key: "spreadsheetUrl", label: "Spreadsheet URL", type: "url", placeholder: "https://docs.google.com/spreadsheets/d/..." },
    { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", placeholder: "Optional — extracted from URL" },
    { key: "apiKey", label: "API key / service account", type: "textarea", placeholder: "Service account JSON or API key" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Sheet name, tab, sync frequency..." },
  ],
  hubspot: [
    { key: "portalId", label: "Portal ID", type: "text" },
    { key: "apiKey", label: "Private app token / API key", type: "text" },
    { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "Optional webhook endpoint" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  zoho: [
    { key: "apiUrl", label: "API domain", type: "url", placeholder: "https://www.zohoapis.com" },
    { key: "clientId", label: "Client ID", type: "text" },
    { key: "clientSecret", label: "Client secret", type: "text" },
    { key: "refreshToken", label: "Refresh token", type: "text" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  other: [
    { key: "label", label: "Integration name", type: "text", placeholder: "e.g. Custom CRM" },
    { key: "apiUrl", label: "API / portal URL", type: "url" },
    { key: "apiKey", label: "API key / credentials", type: "textarea" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};
