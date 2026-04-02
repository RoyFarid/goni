const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("ep_token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error desconocido");
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email, password, full_name) =>
    fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name }),
    }).then(handleResponse),

  login: async (email, password) => {
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await handleResponse(res);
    localStorage.setItem("ep_token", data.access_token);
    localStorage.setItem("ep_user", JSON.stringify({
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      tier: data.membership_tier,
    }));
    return data;
  },

  logout: () => {
    localStorage.removeItem("ep_token");
    localStorage.removeItem("ep_user");
  },

  me: () =>
    fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() }).then(handleResponse),

  currentUser: () => {
    const raw = localStorage.getItem("ep_user");
    return raw ? JSON.parse(raw) : null;
  },
};

// ─── Profiles ─────────────────────────────────────────────────────────────────
export const profilesApi = {
  list: () =>
    fetch(`${API_BASE}/api/profiles`, { headers: authHeaders() }).then(handleResponse),

  create: (profile_name, remarks = "") =>
    fetch(`${API_BASE}/api/profiles`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ profile_name, remarks }),
    }).then(handleResponse),

  get: (profileId) =>
    fetch(`${API_BASE}/api/profiles/${profileId}`, { headers: authHeaders() }).then(handleResponse),

  delete: (profileId) =>
    fetch(`${API_BASE}/api/profiles/${profileId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),

  saveMeasurements: (profileId, templateId, measurements) =>
    fetch(`${API_BASE}/api/profiles/${profileId}/measurements`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ template_id: templateId, measurements }),
    }).then(handleResponse),
};

// ─── Patterns ─────────────────────────────────────────────────────────────────
export const patternsApi = {
  listTemplates: () =>
    fetch(`${API_BASE}/api/templates`, { headers: authHeaders() }).then(handleResponse),

  requiredMeasurements: (templateId) =>
    fetch(`${API_BASE}/api/templates/${templateId}/required-measurements`, {
      headers: authHeaders(),
    }).then(handleResponse),

  compute: (templateId, profileId) =>
    fetch(`${API_BASE}/api/patterns/${templateId}/compute/${profileId}`, {
      headers: authHeaders(),
    }).then(handleResponse),

  downloadDxf: async (templateId, profileId, templateName) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/api/patterns/${templateId}/compute/${profileId}/dxf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Error generando DXF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName || "molde"}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
