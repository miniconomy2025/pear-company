// export const API_BASE_URL = `https://pear-company-api.projects.bbdgrad.com`;
// export const API_BASE_URL = `http://localhost:5000`;

const isProd = window.location.hostname !== "localhost";

export const API_BASE_URL = isProd
  ? "https://pear-company-api.projects.bbdgrad.com"
  : "http://localhost:5000";
