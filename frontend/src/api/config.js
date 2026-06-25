const API_ROOT =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

export function apiUrl(path = "") {
  const suffix = path ? `/${path.replace(/^\//, "")}` : "";
  return `${API_ROOT}${suffix}`;
}

export { API_ROOT };
