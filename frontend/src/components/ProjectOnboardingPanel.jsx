import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, MessageSquare } from "lucide-react";
import { completeOnboardingStep } from "../api/crmApi";

export default function ProjectOnboardingPanel({ onboarding, project, onUpdate }) {
  const navigate = useNavigate();

  if (!onboarding || onboarding.status === "completed") {
    return (
      <div className="onboarding-panel complete">
        <div className="onboarding-panel-header">
          <CheckCircle2 size={18} />
          <strong>Onboarding complete</strong>
        </div>
        <p>You are cleared to log work on this project.</p>
      </div>
    );
  }

  async function completeStep(step) {
    try {
      const updated = await completeOnboardingStep(onboarding.id, step.stepId);
      onUpdate?.(updated);
    } catch (err) {
      window.alert(err.message);
    }
  }

  function handleStepAction(step) {
    if (step.completedAt) return;

    if (step.action === "join_chat") {
      navigate("/chat", { state: { projectId: project.id } });
      completeStep(step);
      return;
    }

    if (step.action === "first_work_log") {
      const prereqsDone = onboarding.steps
        .filter((s) => s.action !== "first_work_log")
        .every((s) => s.completedAt);
      if (!prereqsDone) {
        window.alert("Complete the earlier onboarding steps first.");
        return;
      }
      navigate("/daily-work", { state: { projectId: project.id } });
      return;
    }

    completeStep(step);
  }

  return (
    <div className="onboarding-panel">
      <div className="onboarding-panel-header">
        <strong>Project onboarding required</strong>
        <span className="onboarding-progress">
          {onboarding.completedSteps}/{onboarding.totalSteps} steps
        </span>
      </div>
      <div className="onboarding-progress-bar">
        <span style={{ width: `${onboarding.progressPercent}%` }} />
      </div>
      <ul className="onboarding-steps">
        {onboarding.steps.map((step) => (
          <li key={step.stepId} className={step.completedAt ? "done" : ""}>
            <button
              type="button"
              className="onboarding-step-btn"
              onClick={() => handleStepAction(step)}
              disabled={Boolean(step.completedAt)}
            >
              {step.completedAt ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              <span>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </button>
            {step.action === "join_chat" && !step.completedAt && (
              <button
                type="button"
                className="onboarding-step-link"
                onClick={() => handleStepAction(step)}
              >
                <MessageSquare size={14} /> Open chat
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="onboarding-note">
        Complete all steps before logging daily work on this project.
      </p>
    </div>
  );
}
