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

function normalizeProject(body, existing = {}) {
  const assignedEmployeeIds =
    body.assignedEmployeeIds !== undefined
      ? (body.assignedEmployeeIds || []).map(Number)
      : existing.assignedEmployeeIds || [];

  return {
    name: body.name ?? existing.name,
    clientName: body.clientName ?? existing.clientName,
    clientId: body.clientId !== undefined ? Number(body.clientId) || existing.clientId : existing.clientId,
    description: body.description !== undefined ? body.description : existing.description || "",
    status: body.status ?? existing.status,
    startDate: body.startDate ?? existing.startDate,
    endDate: body.endDate !== undefined ? body.endDate : existing.endDate || "",
    assignedEmployeeIds,
    projectType: body.projectType ?? existing.projectType ?? "website_creation",
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
  };
}

module.exports = {
  normalizeProject,
  normalizeReferenceSites,
  normalizeDocuments,
};
