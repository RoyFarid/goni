import { useState, useEffect } from "react";
import { profilesApi, patternsApi } from "../api/client";
import ConfirmModal from "./ConfirmModal";
import IconButton from "./IconButton";

export default function Library({ user, selectedProfileId, setProfileId, onViewPattern }) {
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileSearchTerm, setProfileSearchTerm] = useState("");

  // Estado para la creación de nuevo perfil
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  // Estado para la edición y eliminación de perfil
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [p, t] = await Promise.all([
        profilesApi.list(),
        patternsApi.listTemplates()
      ]);
      setProfiles(p);
      setTemplates(t);
      // Solo seleccionamos el primero si no hay ninguno seleccionado ya en el estado global
      if (p.length > 0 && !selectedProfileId) {
        setProfileId(p[0].id);
      }
    } catch (err) {
      console.error("Error cargando biblioteca:", err);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewName("");
    setError("");
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewName("");
  };

  const handleSaveProfile = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Verificar duplicados
    const exists = profiles.some(p => p.profile_name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError("Ya existe un perfil con ese nombre");
      return;
    }

    try {
      const newP = await profilesApi.create(trimmed);
      setProfiles([...profiles, newP]);
      setProfileId(newP.id);
      setIsCreating(false);
      setNewName("");
    } catch (err) {
      setError("Error al guardar");
    }
  };

  const handleStartEdit = () => {
    if (!selectedProfileId) return;
    const p = profiles.find(pf => pf.id == selectedProfileId);
    if (!p) return;
    setEditingProfileId(p.id);
    setEditName(p.profile_name);
    setError("");
  };

  const handleUpdateProfile = async (idToUpdate) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    try {
      const updatedP = await profilesApi.update(idToUpdate, { profile_name: trimmed });
      setProfiles(profiles.map(p => p.id === idToUpdate ? { ...p, profile_name: updatedP.profile_name } : p));
      setEditingProfileId(null);
      setEditName("");
    } catch (err) {
      setError("Error al actualizar");
    }
  };

  const handleDeleteProfile = async () => {
    if (!deletingProfile) return;
    try {
      await profilesApi.delete(deletingProfile.id);
      setProfiles(profiles.filter(p => p.id !== deletingProfile.id));
      if (selectedProfileId == deletingProfile.id) {
        setProfileId(null);
      }
      setDeletingProfile(null);
    } catch (err) {
      setError("Error al eliminar");
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.garment_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProfiles = profiles.filter(p =>
    p.profile_name.toLowerCase().includes(profileSearchTerm.toLowerCase())
  );

  const selectedProfile = profiles.find(p => p.id === Number(selectedProfileId));

  return (
    <div className="library-container">
      {/* Sidebar de la Biblioteca */}
      <aside className="library-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-icon-box">
            <span className="material-symbols-outlined">folder_open</span>
          </div>
          <div>
            <div className="sidebar-title">Biblioteca</div>
            <div className="sidebar-subtitle">Gestión de activos</div>
          </div>
        </div>

        <nav className="library-nav">
          <button className="lib-nav-item active">
            <span className="material-symbols-outlined">grid_view</span>
            Todos los patrones
          </button>
          <button className="lib-nav-item">
            <span className="material-symbols-outlined">texture</span>
            Biblioteca de telas
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-primary w-full">
            <span className="material-symbols-outlined">add</span>
            Nuevo Patrón
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="library-main">
        <div className="library-content">

          {/* Sección de Perfiles (Client Library) */}
          <section className="library-section">
            <div className="section-header-row">
              <h2 className="library-h2">Biblioteca de Clientes</h2>
              <div className="header-actions">
                <div className="search-wrap">
                  <span className="material-symbols-outlined search-icon">search</span>
                  <input
                    type="text"
                    placeholder="Buscar perfiles..."
                    className="search-input"
                    value={profileSearchTerm}
                    onChange={(e) => setProfileSearchTerm(e.target.value)}
                  />
                </div>
                <IconButton
                  icon="edit"
                  text="Editar Perfil"
                  disabled={!selectedProfileId}
                  onClick={handleStartEdit}
                />
              </div>
            </div>

            <div className="profiles-horizontal-list">
              {filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className={`profile-card ${selectedProfileId == p.id ? "active" : ""} ${editingProfileId == p.id ? "editing" : ""}`}
                  onClick={() => {
                    if (editingProfileId !== p.id) setProfileId(p.id);
                  }}
                  style={{ position: "relative" }}
                >
                  {/* Boton de eliminar perfil */}
                  {selectedProfileId == p.id && editingProfileId !== p.id && (
                    <button
                      className="delete-profile-btn"
                      onClick={(e) => { e.stopPropagation(); setDeletingProfile(p); }}
                      title="Eliminar Perfil"
                    >
                      <span className="material-symbols-outlined">delete_forever</span>
                    </button>
                  )}

                  <div className="profile-card-inner">
                    <div className="profile-avatar-placeholder">
                      <span className="material-symbols-outlined">person</span>
                    </div>

                    {editingProfileId == p.id ? (
                      <div className="profile-input-group" style={{ marginTop: 0, marginBottom: "8px" }}>
                        <input
                          autoFocus
                          className="profile-inline-input"
                          value={editName}
                          onChange={(e) => { setEditName(e.target.value); setError(""); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateProfile(p.id);
                            if (e.key === "Escape") setEditingProfileId(null);
                          }}
                        />
                        <button className="save-inline-btn" onClick={(e) => { e.stopPropagation(); handleUpdateProfile(p.id); }}>
                          <span className="material-symbols-outlined">check_circle</span>
                        </button>
                      </div>
                    ) : (
                      <div className="profile-card-name" style={{ marginBottom: "4px" }}>{p.profile_name}</div>
                    )}
                    <div className="profile-card-meta">Perfil de Medidas</div>
                  </div>
                </div>
              ))}

              {/* Card de creación inline */}
              {isCreating ? (
                <div className="profile-card creating">
                  <div className="profile-card-inner">
                    <div className="profile-avatar-placeholder">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="profile-input-group">
                      <input
                        autoFocus
                        className="profile-inline-input"
                        placeholder="Nombre..."
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setError(""); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveProfile();
                          if (e.key === "Escape") handleCancelCreate();
                        }}
                      />
                      <button className="save-inline-btn" onClick={handleSaveProfile}>
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                    </div>
                    {error && <div className="inline-error">{error}</div>}
                  </div>
                </div>
              ) : (
                <button className="add-profile-card" onClick={handleStartCreate}>
                  <div className="add-profile-icon">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <span>Nuevo Perfil</span>
                </button>
              )}
            </div>
          </section>

          {/* Grid de Patrones */}
          <section className="library-section">
            <div className="section-header-row">
              <div>
                <h2 className="library-h3">
                  {selectedProfile ? `Proyectos Recientes: ${selectedProfile.profile_name}` : "Todos los Patrones"}
                </h2>
                <div className="h-underline"></div>
              </div>

              <div className="header-actions">
                <div className="search-wrap">
                  <span className="material-symbols-outlined search-icon">search</span>
                  <input
                    type="text"
                    placeholder="Buscar patrones..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <IconButton
                  icon="filter_list"
                  text="Filtro"
                />
              </div>
            </div>

            <div className="pattern-grid">
              {filteredTemplates.map((t) => (
                <div key={t.id} className="pattern-card group">
                  <div className="pattern-card-preview">
                    <div className="pattern-icon-placeholder">
                      <span className="material-symbols-outlined">checkroom</span>
                    </div>
                    <div className="pattern-card-actions">
                      <IconButton
                        icon="visibility"
                        onClick={() => onViewPattern && onViewPattern(t.id, selectedProfileId)}
                        title="Ver en Workspace"
                      />
                      <IconButton icon="edit" title="Editar Patrón" />
                      <IconButton icon="delete" title="Eliminar Patrón" />
                    </div>
                  </div>
                  <div className="pattern-card-info">
                    <div className="pattern-card-title-row">
                      <h4 className="pattern-card-title">{t.template_name}</h4>
                      <span className="version-label">V1.0</span>
                    </div>
                    <p className="pattern-card-desc">{t.garment_category || "Molde Técnico"} • Industrial</p>
                    <div className="pattern-card-stats">
                      <div className="p-stat">
                        <span className="material-symbols-outlined">straighten</span>
                        <span>Talla M</span>
                      </div>
                      <div className="p-stat">
                        <span className="material-symbols-outlined">layers</span>
                        <span>5 Capas</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="empty-state">
                  <span className="material-symbols-outlined">search_off</span>
                  <p>No se encontraron patrones con ese nombre.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Modal Confirmación de Eliminación Reusable */}
      <ConfirmModal
        isOpen={!!deletingProfile}
        title="Eliminar Perfil"
        type="danger"
        confirmText="Eliminar"
        onConfirm={handleDeleteProfile}
        onCancel={() => setDeletingProfile(null)}
      >
        <p>
          ¿Estás seguro de eliminar el perfil <strong>{deletingProfile?.profile_name}</strong>?
          <br />Esta acción también borrará todas sus medidas y <strong>no se puede deshacer</strong>.
        </p>
      </ConfirmModal>
    </div>
  );
}
