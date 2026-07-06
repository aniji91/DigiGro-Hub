function normalizeDueAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeTimelineTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .map((item, index) => {
      const source = item && typeof item === "object" ? item : {};
      const status = ["New", "Completed", "Carry forward"].includes(source.status)
        ? source.status
        : "New";
      return {
        id: source.id || `tl-${index + 1}`,
        activity: (source.activity || "").trim(),
        assignee: (source.assignee || "").trim(),
        tentativeDate: source.tentativeDate ? String(source.tentativeDate).slice(0, 10) : "",
        revisedDate: source.revisedDate ? String(source.revisedDate).slice(0, 10) : "",
        completeBy: normalizeDueAt(source.completeBy),
        prerequisites: (source.prerequisites || "").trim(),
        status,
        overdueNote: (source.overdueNote || "").trim(),
      };
    })
    .filter((item) => item.activity);
}

function normalizeReferenceSites(sites) {
  if (!Array.isArray(sites)) return [];
  return sites
    .map((site) => ({
      label: (site.label || "").trim(),
      url: (site.url || "").trim(),
    }))
    .filter((site) => site.url);
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((doc) => doc?.name && doc?.dataUrl)
    .map((doc) => ({
      name: doc.name,
      mimeType: doc.mimeType || "application/octet-stream",
      dataUrl: doc.dataUrl,
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
    }));
}

function normalizeEnvironmentDetails(body, existing = {}) {
  const source = body && typeof body === "object" ? body : {};
  return {
    siteUrl: source.siteUrl !== undefined ? (source.siteUrl || "").trim() : existing.siteUrl || "",
    domainDetails:
      source.domainDetails !== undefined
        ? (source.domainDetails || "").trim()
        : existing.domainDetails || "",
    hostingDetails:
      source.hostingDetails !== undefined
        ? (source.hostingDetails || "").trim()
        : existing.hostingDetails || "",
    ftpDetails:
      source.ftpDetails !== undefined ? (source.ftpDetails || "").trim() : existing.ftpDetails || "",
  };
}

function normalizeExternalCrmIntegrations(integrations) {
  if (!Array.isArray(integrations)) return [];

  return integrations
    .map((item, index) => {
      const source = item && typeof item === "object" ? item : {};
      const provider = (source.provider || "other").trim() || "other";
      return {
        id: (source.id || `crm-${index + 1}`).trim(),
        provider,
        label: (source.label || "").trim(),
        apiUrl: (source.apiUrl || "").trim(),
        apiKey: (source.apiKey || "").trim(),
        accessKey: (source.accessKey || "").trim(),
        secretKey: (source.secretKey || "").trim(),
        clientId: (source.clientId || "").trim(),
        clientSecret: (source.clientSecret || "").trim(),
        accessToken: (source.accessToken || "").trim(),
        refreshToken: (source.refreshToken || "").trim(),
        webhookUrl: (source.webhookUrl || "").trim(),
        spreadsheetUrl: (source.spreadsheetUrl || "").trim(),
        spreadsheetId: (source.spreadsheetId || "").trim(),
        instanceUrl: (source.instanceUrl || "").trim(),
        username: (source.username || "").trim(),
        securityToken: (source.securityToken || "").trim(),
        portalId: (source.portalId || "").trim(),
        notes: (source.notes || "").trim(),
      };
    })
    .filter((item) => {
      const { id, provider, ...fields } = item;
      return Object.values(fields).some(Boolean);
    });
}

function normalizeProject(body, existing = {}) {
  const assignedEmployeeIds =
    body.assignedEmployeeIds !== undefined
      ? (body.assignedEmployeeIds || []).map(Number)
      : existing.assignedEmployeeIds || [];

  const ownerId =
    body.ownerId !== undefined
      ? body.ownerId === null || body.ownerId === ""
        ? null
        : Number(body.ownerId) || null
      : existing.ownerId ?? null;

  return {
    name: body.name ?? existing.name,
    clientName: body.clientName !== undefined ? (body.clientName || "") : (existing.clientName || ""),
    clientId:
      body.clientId !== undefined
        ? body.clientId === null || body.clientId === ""
          ? null
          : Number(body.clientId) || null
        : existing.clientId ?? null,
    description: body.description !== undefined ? body.description : existing.description || "",
    status: body.status ?? existing.status,
    startDate: body.startDate ?? existing.startDate,
    endDate: body.endDate !== undefined ? body.endDate : existing.endDate || "",
    assignedEmployeeIds,
    ownerId,
    projectType: body.projectType ?? existing.projectType ?? "website_creation",
    sitemapLink:
      body.sitemapLink !== undefined
        ? (body.sitemapLink || "").trim()
        : existing.sitemapLink || "",
    contentDoc:
      body.contentDoc !== undefined
        ? (body.contentDoc || "").trim()
        : existing.contentDoc || "",
    questionnaire:
      body.questionnaire !== undefined
        ? (body.questionnaire || "").trim()
        : existing.questionnaire || "",
    logoBrand:
      body.logoBrand !== undefined
        ? (body.logoBrand || "").trim()
        : existing.logoBrand || "",
    imagePack:
      body.imagePack !== undefined
        ? (body.imagePack || "").trim()
        : existing.imagePack || "",
    existingSiteUrl:
      body.existingSiteUrl !== undefined
        ? (body.existingSiteUrl || "").trim()
        : existing.existingSiteUrl || "",
    referenceSites:
      body.referenceSites !== undefined
        ? normalizeReferenceSites(body.referenceSites)
        : existing.referenceSites || [],
    suggestions:
      body.suggestions !== undefined ? (body.suggestions || "").trim() : existing.suggestions || "",
    targetAudience:
      body.targetAudience !== undefined
        ? (body.targetAudience || "").trim()
        : existing.targetAudience || "",
    pageScope:
      body.pageScope !== undefined ? (body.pageScope || "").trim() : existing.pageScope || "",
    techPreferences:
      body.techPreferences !== undefined
        ? (body.techPreferences || "").trim()
        : existing.techPreferences || "",
    documents:
      body.documents !== undefined ? normalizeDocuments(body.documents) : existing.documents || [],
    stagingDetails:
      body.stagingDetails !== undefined
        ? normalizeEnvironmentDetails(body.stagingDetails, existing.stagingDetails)
        : existing.stagingDetails || normalizeEnvironmentDetails(),
    productionDetails:
      body.productionDetails !== undefined
        ? normalizeEnvironmentDetails(body.productionDetails, existing.productionDetails)
        : existing.productionDetails || normalizeEnvironmentDetails(),
    externalCrmIntegrations:
      body.externalCrmIntegrations !== undefined
        ? normalizeExternalCrmIntegrations(body.externalCrmIntegrations)
        : existing.externalCrmIntegrations || [],
    timelineTasks:
      body.timelineTasks !== undefined
        ? normalizeTimelineTasks(body.timelineTasks)
        : existing.timelineTasks || [],
  };
}

module.exports = {
  normalizeProject,
  normalizeReferenceSites,
  normalizeDocuments,
  normalizeEnvironmentDetails,
  normalizeExternalCrmIntegrations,
  normalizeTimelineTasks,
};
