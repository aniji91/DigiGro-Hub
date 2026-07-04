import { PROJECT_DOC_LINKS, PROJECT_TYPE_LABELS } from "../config/projectConfig";

function DocLinkRow({ label, url }) {
  return (
    <div className="view-row">
      <span>{label}</span>
      <strong>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">{url}</a>
        ) : (
          "—"
        )}
      </strong>
    </div>
  );
}

function BriefFields({ project, references, documents, grid = false }) {
  return (
    <div className={`view-details ${grid ? "view-details--grid" : ""}`}>
      <div className="view-row">
        <span>Existing site</span>
        <strong>
          {project.existingSiteUrl ? (
            <a href={project.existingSiteUrl} target="_blank" rel="noreferrer">{project.existingSiteUrl}</a>
          ) : "—"}
        </strong>
      </div>
      <div className="view-row">
        <span>Reference sites</span>
        <div className="reference-site-view-list">
          {references.length > 0 ? (
            references.map((site, i) => (
              <div key={i} className="reference-site-view-item">
                {site.label && <em>{site.label}: </em>}
                <a href={site.url} target="_blank" rel="noreferrer">{site.url}</a>
              </div>
            ))
          ) : (
            <strong>—</strong>
          )}
        </div>
      </div>
      <div className="view-row"><span>Target audience</span><strong>{project.targetAudience || "—"}</strong></div>
      <div className="view-row"><span>Pages / scope</span><strong>{project.pageScope || "—"}</strong></div>
      <div className="view-row"><span>Tech preferences</span><strong>{project.techPreferences || "—"}</strong></div>
      <div className="view-row view-row--full"><span>Suggestions</span><strong className="pre-wrap">{project.suggestions || "—"}</strong></div>
      <div className="view-row view-row--full">
        <span>Documents</span>
        <div className="employee-doc-list">
          {documents.length > 0 ? (
            documents.map((doc, i) => (
              <li key={i}>
                <a href={doc.dataUrl} target="_blank" rel="noreferrer" download={doc.name}>{doc.name}</a>
              </li>
            ))
          ) : (
            <strong>—</strong>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectBriefDetails({ project, hideOverview = false }) {
  const references = project.referenceSites || [];
  const documents = project.documents || [];
  const hasBrief =
    project.existingSiteUrl ||
    references.length > 0 ||
    project.targetAudience ||
    project.pageScope ||
    project.techPreferences ||
    project.suggestions ||
    documents.length > 0;

  return (
    <>
      {!hideOverview && (
        <div className="view-details">
          <div className="view-row"><span>Project</span><strong>{project.name}</strong></div>
          <div className="view-row"><span>Client</span><strong>{project.clientName}</strong></div>
          <div className="view-row">
            <span>Project Type</span>
            <strong>{PROJECT_TYPE_LABELS[project.projectType] || project.projectType || "—"}</strong>
          </div>
          <div className="view-row"><span>Description</span><strong>{project.description || "—"}</strong></div>
          {PROJECT_DOC_LINKS.map((field) => (
            <DocLinkRow key={field.key} label={field.label} url={project[field.key]} />
          ))}
          <div className="view-row"><span>Status</span><strong><span className="badge">{project.status}</span></strong></div>
          <div className="view-row"><span>Start Date</span><strong>{project.startDate}</strong></div>
          <div className="view-row"><span>End Date</span><strong>{project.endDate || "—"}</strong></div>
        </div>
      )}

      {hideOverview && project.description && (
        <p className="project-view-description">{project.description}</p>
      )}

      {hideOverview && (
        <div className="view-details view-details--grid project-doc-links">
          {PROJECT_DOC_LINKS.map((field) => (
            <DocLinkRow key={field.key} label={field.label} url={project[field.key]} />
          ))}
        </div>
      )}

      {hasBrief ? (
        <div className="project-brief-panel">
          <h4>Website brief</h4>
          <BriefFields project={project} references={references} documents={documents} grid={hideOverview} />
        </div>
      ) : hideOverview ? (
        <p className="muted project-view-no-brief">No website brief added for this project.</p>
      ) : (
        <div className="project-brief-panel">
          <h4>Website brief</h4>
          <BriefFields project={project} references={references} documents={documents} />
        </div>
      )}
    </>
  );
}
