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
  projectType: "website_creation",
  existingSiteUrl: "",
  referenceSites: [{ label: "", url: "" }],
  suggestions: "",
  targetAudience: "",
  pageScope: "",
  techPreferences: "",
  documents: [],
};
