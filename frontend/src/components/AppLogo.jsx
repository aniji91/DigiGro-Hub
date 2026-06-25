import { APP_NAME, LOGO_ALT, LOGO_SRC } from "../config/branding";

export default function AppLogo({ size = "md", layout = "stacked" }) {
  const sizeClass = size === "lg" ? "app-logo--lg" : size === "sm" ? "app-logo--sm" : "";
  const layoutClass = layout === "inline" ? "app-logo--inline" : "";

  return (
    <div className={`app-logo ${sizeClass} ${layoutClass}`.trim()}>
      <img src={LOGO_SRC} alt={LOGO_ALT} className="app-logo-image" />
      <div className="app-logo-copy">
        <div className="app-logo-title">
          <span className="app-logo-hub">Hub</span>
        </div>
        <span className="sr-only">{APP_NAME}</span>
      </div>
    </div>
  );
}
