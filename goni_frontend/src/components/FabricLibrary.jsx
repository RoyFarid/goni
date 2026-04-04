import { useState, useEffect } from "react";
import { fabricsApi } from "../api/client";
import IconButton from "./IconButton";

export default function FabricLibrary({ user }) {
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", material: "", width_cm: "", weight_gsm: "",
    stretch_horizontal: "", stretch_vertical: "",
    shrinkage_warp: "", shrinkage_weft: "", inclination: "Recto",
    color_hex: "#c1c7cf"
  });

  const openForm = () => {
    if (user?.tier === "guest") {
      alert("Debes iniciar sesión con una cuenta para guardar telas en tu biblioteca privada.");
      return;
    }
    setFormData({
      name: "", material: "", width_cm: "", weight_gsm: "",
      stretch_horizontal: "", stretch_vertical: "",
      shrinkage_warp: "", shrinkage_weft: "", inclination: "Recto",
      color_hex: "#c1c7cf"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.tier === "guest") {
      alert("Debes iniciar sesión con una cuenta para guardar telas en tu biblioteca privada.");
      setShowModal(false);
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      for (const k in payload) {
        if (payload[k] === "") payload[k] = null;
        else if (["width_cm", "weight_gsm", "stretch_horizontal", "stretch_vertical", "shrinkage_warp", "shrinkage_weft"].includes(k) && payload[k] != null) {
          payload[k] = parseFloat(payload[k]);
        }
      }
      const newFab = await fabricsApi.create(payload);
      setFabrics([...fabrics, newFab]);
      setShowModal(false);
    } catch (err) {
      alert("Error al guardar: " + err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (user?.tier !== "guest") {
        const data = await fabricsApi.list();
        setFabrics(data);
      } else {
        const data = await fabricsApi.listPublic();
        setFabrics(data);
      }
    } catch (err) {
      console.error("Error cargando telas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFabrics = fabrics.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.material && f.material.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <section className="library-section">
      <div className="section-header-row">
        <div>
          <h2 className="library-h2">Biblioteca de Telas</h2>
          <div className="h-underline"></div>
        </div>

        <div className="header-actions">
          <div className="search-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Buscar telas por nombre o material..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <IconButton icon="add" text="Nueva Tela" className="btn-primary" onClick={openForm} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--outline)" }}>
          Cargando Telas...
        </div>
      ) : (
        <div className="fabric-grid">
          {filteredFabrics.map((f) => (
            <div key={f.id} className="fabric-card group">
              <div
                className="fabric-preview"
                style={{ backgroundColor: f.color_hex || '#c1c7cf' }}
              >
                <div className="fabric-tag">
                  {f.inclination || "Estándar"}
                </div>
              </div>

              <div className="fabric-info">
                <div className="fabric-title-row">
                  <h3 className="fabric-title">{f.name}</h3>
                </div>
                <p className="fabric-material">{f.material || "Material Especificado"}</p>

                <div className="fabric-specs-grid">
                  <div className="fs-item">
                    <span className="fs-label">Gramaje</span>
                    <span className="fs-value">{f.weight_gsm || "-"} g/m²</span>
                  </div>
                  <div className="fs-item">
                    <span className="fs-label">Encog. (U/T)</span>
                    <span className="fs-value">S: {f.shrinkage_warp || 0}% / {f.shrinkage_weft || 0}%</span>
                  </div>
                  <div className="fs-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="fs-label">Elasticidad (H / V)</span>
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <span className="fs-value"><span className="hl">H:</span> {f.stretch_horizontal || 0}%</span>
                      <span className="fs-value"><span className="hl">V:</span> {f.stretch_vertical || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="fabric-actions">
                  <IconButton icon="edit" title="Editar Tela" />
                  <IconButton icon="content_copy" title="Duplicar" />
                  <IconButton icon="delete" title="Eliminar Tela" />
                </div>
              </div>
            </div>
          ))}

          <button className="fabric-card dashed" onClick={openForm}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid var(--outline-variant)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
              <span className="material-symbols-outlined text-[24px]">add</span>
            </div>
            <span>Crear Ficha de Tela</span>
          </button>
        </div>
      )}

      {/* Modal Overlay para Crear Tela */}
      {showModal && (
        <div className="plans-modal-overlay" style={{ zIndex: 1000, overflowY: "auto", padding: "20px" }}>
          <div className="login-card" style={{ width: "680px", maxWidth: "100%", padding: "32px", margin: "auto" }}>
            <div className="login-header" style={{ marginBottom: "24px", textAlign: "left" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--on-surface)", marginBottom: "4px" }}>Nueva Ficha de Tela</h2>
              <p style={{ fontSize: "13px", color: "var(--secondary)" }}>Ingresa las propiedades físicas del material. Los datos se guardarán privadamente en tu base de datos.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px", textAlign: "left" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Nombre de la Tela *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Jersey 30/1 Peinado" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Composición / Material</label>
                <input type="text" value={formData.material} onChange={e => setFormData({ ...formData, material: e.target.value })} placeholder="Ej: 100% Algodón" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Color de Render UI</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="color" value={formData.color_hex} onChange={e => setFormData({ ...formData, color_hex: e.target.value })} style={{ width: "40px", height: "38px", padding: "0", cursor: "pointer", border: "1px solid var(--outline-variant)", borderRadius: "6px" }} />
                  <input type="text" value={formData.color_hex} onChange={e => setFormData({ ...formData, color_hex: e.target.value })} className="search-input" />
                </div>
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Ancho Útil (cm)</label>
                <input type="number" step="0.1" value={formData.width_cm} onChange={e => setFormData({ ...formData, width_cm: e.target.value })} placeholder="Aprox 150" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Gramaje (g/m²)</label>
                <input type="number" value={formData.weight_gsm} onChange={e => setFormData({ ...formData, weight_gsm: e.target.value })} placeholder="Aprox 180" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Elasticidad H (%)</label>
                <input type="number" step="0.1" value={formData.stretch_horizontal} onChange={e => setFormData({ ...formData, stretch_horizontal: e.target.value })} placeholder="0.0" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Elasticidad V (%)</label>
                <input type="number" step="0.1" value={formData.stretch_vertical} onChange={e => setFormData({ ...formData, stretch_vertical: e.target.value })} placeholder="0.0" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Encogimiento Trama (%)</label>
                <input type="number" step="0.1" value={formData.shrinkage_weft} onChange={e => setFormData({ ...formData, shrinkage_weft: e.target.value })} placeholder="0.0" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Encogimiento Urdimbre (%)</label>
                <input type="number" step="0.1" value={formData.shrinkage_warp} onChange={e => setFormData({ ...formData, shrinkage_warp: e.target.value })} placeholder="0.0" className="search-input" />
              </div>

              <div>
                <label className="fs-label" style={{ display: "block", marginBottom: "6px" }}>Inclinación Textil</label>
                <select value={formData.inclination} onChange={e => setFormData({ ...formData, inclination: e.target.value })} className="search-input">
                  <option value="Recto">Recto</option>
                  <option value="Al Sesgo">Al Sesgo</option>
                  <option value="Tubular">Tubular</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  <span className="material-symbols-outlined">save</span>
                  {saving ? "Guardando..." : "Guardar Ficha Técnica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
