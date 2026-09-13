const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";


// ─── Token helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("ep_token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── Guest identity ────────────────────────────────────────────────────────────
export const getGuestId = () => {
  let gid = localStorage.getItem("goni_guest_id");
  if (!gid) {
    // Genera un ID simple "guest_xxxxx" que persiste en el navegador
    gid = "guest_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("goni_guest_id", gid);
  }
  return gid;
};

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));

    // FastAPI/Pydantic validation errors return detail as an array of objects
    let msg;
    if (Array.isArray(err.detail)) {
      // Extract the "msg" field from each validation error, or stringify the object
      msg = err.detail
        .map((e) => {
          if (typeof e === "string") return e;
          // Pydantic v2 uses e.msg, Pydantic v1 uses e.msg too
          const field = Array.isArray(e.loc) ? e.loc.join(" → ") : null;
          const text = e.msg || JSON.stringify(e);
          return field ? `${field}: ${text}` : text;
        })
        .join("; ");
    } else if (typeof err.detail === "object" && err.detail !== null) {
      msg = JSON.stringify(err.detail);
    } else {
      msg = err.detail || err.message || "Error desconocido";
    }

    // ── Token inválido / expirado → logout automático ─────────────────────
    if (res.status === 401) {
      localStorage.removeItem("ep_token");
      localStorage.removeItem("ep_user");
      // Notifica a la app para que actualice el estado de autenticación
      window.dispatchEvent(new CustomEvent("goni:unauthorized", { detail: msg }));
    }

    throw new Error(msg);
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
      plan_name: data.plan_name,
    }));
    return data;
  },

  logout: () => {
    localStorage.removeItem("ep_token");
    localStorage.removeItem("ep_user");
    localStorage.removeItem("goni_selected_template");
    localStorage.removeItem("goni_selected_profile");
    localStorage.removeItem("goni_selected_fabric");
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

  update: (profileId, data) =>
    fetch(`${API_BASE}/api/profiles/${profileId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

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

  getPlanLimits: (planId) =>
    fetch(`${API_BASE}/api/profiles/plans/${planId}/limits`, { 
      headers: { "Content-Type": "application/json" }
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

  compute: (templateId, profileId, fabricId = "", customSeam = null, customEase = null, easeType = "regular") => {
    let url = `${API_BASE}/api/patterns/${templateId}/compute/${profileId}?ease_type=${easeType}`;
    if (fabricId) url += `&fabric_id=${fabricId}`;
    if (customSeam !== null && customSeam !== "") url += `&custom_seam=${customSeam}`;
    if (customEase !== null && customEase !== "") url += `&custom_ease=${customEase}`;
    
    return fetch(url, { headers: authHeaders() }).then(handleResponse);
  },

  downloadDxf: async (templateId, profileId, templateName, fabricId = "", customSeam = null, customEase = null, easeType = "regular") => {
    const token = getToken();
    let endpoint = `${API_BASE}/api/patterns/${templateId}/compute/${profileId}/dxf?ease_type=${easeType}`;
    if (fabricId) endpoint += `&fabric_id=${fabricId}`;
    if (customSeam !== null && customSeam !== "") endpoint += `&custom_seam=${customSeam}`;
    if (customEase !== null && customEase !== "") endpoint += `&custom_ease=${customEase}`;

    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Error generando DXF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName || "molde"}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── PDF a escala 1:1, dividido en hojas según el tamaño de papel elegido ───
  downloadPdf: async (templateId, profileId, templateName, pageSize = "A4", fabricId = "", customSeam = null, customEase = null, easeType = "regular") => {
    const token = getToken();
    let endpoint = `${API_BASE}/api/patterns/${templateId}/compute/${profileId}/pdf?page_size=${pageSize}&ease_type=${easeType}`;
    if (fabricId) endpoint += `&fabric_id=${fabricId}`;
    if (customSeam !== null && customSeam !== "") endpoint += `&custom_seam=${customSeam}`;
    if (customEase !== null && customEase !== "") endpoint += `&custom_ease=${customEase}`;

    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error generando PDF" }));
      throw new Error(err.detail || "Error generando PDF");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName || "molde"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Guest methods ───────────────────────────────────────────────────────────
  computeGuest: (templateId, measurements, fabricId = null, customSeam = null, customEase = null, easeType = "regular") =>
    fetch(`${API_BASE}/api/patterns/${templateId}/compute-guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        guest_id: getGuestId(), 
        measurements,
        fabric_id: fabricId,
        custom_seam: customSeam,
        custom_ease: customEase,
        ease_type: easeType
      }),
    }).then(handleResponse),

  downloadDxfGuest: async (templateId, measurements, templateName) => {
    const res = await fetch(`${API_BASE}/api/patterns/${templateId}/export-guest/dxf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id: getGuestId(), measurements }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error" }));
      throw new Error(err.detail || "Error generando DXF");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName || "molde"}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadPdfGuest: async (templateId, measurements, templateName, pageSize = "A4") => {
    const res = await fetch(`${API_BASE}/api/patterns/${templateId}/export-guest/pdf?page_size=${pageSize}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id: getGuestId(), measurements }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error" }));
      throw new Error(err.detail || "Error generando PDF");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName || "molde"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ─── Fabrics ──────────────────────────────────────────────────────────────────
export const fabricsApi = {
  list: () =>
    fetch(`${API_BASE}/api/fabrics`, { headers: authHeaders() }).then(handleResponse),
  listPublic: () =>
    fetch(`${API_BASE}/api/fabrics/public`).then(handleResponse),
  create: (data) =>
    fetch(`${API_BASE}/api/fabrics`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  delete: (fabricId) =>
    fetch(`${API_BASE}/api/fabrics/${fabricId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((res) => {
      if (!res.ok) return handleResponse(res);
    }),
};

