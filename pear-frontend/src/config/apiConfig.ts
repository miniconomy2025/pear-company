const isProd = window.location.hostname !== "localhost";
export const API_BASE_URL = isProd
  ? "https://pear-api.duckdns.org" // production backend
  : "http://localhost:5000";       // local development
