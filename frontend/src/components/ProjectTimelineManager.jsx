import { Plus, Trash2 } from "lucide-react";
import {
  EMPTY_TIMELINE_TASK,
  TIMELINE_STATUS_OPTIONS,
  formatTimelineDue,
  isTimelineTaskOverdue,
  nextTimelineTaskId,
  sortTimelineTasks,
  toDatetimeLocal,
} from "../utils/projectTimeline";

export default function ProjectTimelineManager({ tasks = [], onChange, readOnly = false }) {
  const sortedTasks = sortTimelineTasks(tasks);

  function updateTask(index, patch) {
    const next = tasks.map((task, i) => (i === index ? { ...task, ...patch } : task));
    onChange(next);
  }

  function addTask() {
    const id = nextTimelineTaskId(tasks);
    onChange([...tasks, { ...EMPTY_TIMELINE_TASK, id }]);
  }

  function removeTask(index) {
    onChange(tasks.filter((_, i) => i !== index));
  }

  function findTaskIndex(task) {
    return tasks.findIndex((item) => item.id === task.id);
  }

  return (
    <div className="project-timeline-manager">
      <div className="employee-section-header">
        <div>
          <span className="field-label">Project timeline & milestones</span>
          <p className="field-hint">
            Add activities with tentative dates, revisions, and notes. Overdue items are highlighted in red.
          </p>
        </div>
        {!readOnly && (
          <button type="button" className="btn-secondary btn-sm" onClick={addTask}>
            <Plus size={14} /> Add activity
          </button>
        )}
      </div>

      {sortedTasks.length === 0 ? (
        <p className="muted project-timeline-empty">No timeline activities yet.</p>
      ) : (
        <div className="project-timeline-list">
          {sortedTasks.map((task) => {
            const index = findTaskIndex(task);
            const overdue = isTimelineTaskOverdue(task);

            return (
              <div
                key={task.id}
                className={`project-timeline-card ${overdue ? "project-timeline-card--overdue" : ""}`}
              >
                <div className="project-timeline-card-head">
                  <strong>{task.activity || "Untitled activity"}</strong>
                  {overdue && <span className="pm-overdue-badge">Overdue</span>}
                  {!readOnly && (
                    <button
                      type="button"
                      className="icon-action delete"
                      onClick={() => removeTask(index)}
                      title="Delete activity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {readOnly ? (
                  <div className="project-timeline-readonly">
                    <p><span>Who</span><strong>{task.assignee || "—"}</strong></p>
                    <p><span>Tentative date</span><strong>{task.tentativeDate || "—"}</strong></p>
                    <p><span>Revised date</span><strong>{task.revisedDate || "—"}</strong></p>
                    <p><span>Status</span><strong>{task.status}</strong></p>
                    {formatTimelineDue(task) && (
                      <p><span>Complete by</span><strong>{formatTimelineDue(task)}</strong></p>
                    )}
                    {task.prerequisites && (
                      <p className="project-timeline-note"><span>Pre-requisites</span>{task.prerequisites}</p>
                    )}
                    {task.overdueNote && (
                      <p className="project-timeline-note"><span>Reason</span>{task.overdueNote}</p>
                    )}
                  </div>
                ) : (
                  <div className="project-timeline-fields">
                    <label>
                      Activity
                      <input
                        value={task.activity}
                        onChange={(e) => updateTask(index, { activity: e.target.value })}
                        placeholder="e.g. Wireframe Design Delivery"
                        required
                      />
                    </label>
                    <label>
                      Who
                      <input
                        value={task.assignee}
                        onChange={(e) => updateTask(index, { assignee: e.target.value })}
                        placeholder="e.g. DigiGro / Client"
                      />
                    </label>
                    <label>
                      Tentative date
                      <input
                        type="date"
                        value={task.tentativeDate}
                        onChange={(e) => updateTask(index, { tentativeDate: e.target.value })}
                      />
                    </label>
                    <label>
                      Revised date
                      <input
                        type="date"
                        value={task.revisedDate}
                        onChange={(e) => updateTask(index, { revisedDate: e.target.value })}
                      />
                    </label>
                    <label>
                      Complete by
                      <input
                        type="datetime-local"
                        value={toDatetimeLocal(task.completeBy)}
                        onChange={(e) =>
                          updateTask(index, {
                            completeBy: e.target.value ? new Date(e.target.value).toISOString() : "",
                          })
                        }
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(index, { status: e.target.value })}
                      >
                        {TIMELINE_STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label className="full-width-field">
                      Pre-requisites / notes
                      <textarea
                        rows={2}
                        value={task.prerequisites}
                        onChange={(e) => updateTask(index, { prerequisites: e.target.value })}
                        placeholder="Dependencies, feedback notes, blockers..."
                      />
                    </label>
                    <label className="full-width-field">
                      Reason / priority notes
                      <textarea
                        rows={2}
                        value={task.overdueNote}
                        onChange={(e) => updateTask(index, { overdueNote: e.target.value })}
                        placeholder="Why this is priority or overdue..."
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
