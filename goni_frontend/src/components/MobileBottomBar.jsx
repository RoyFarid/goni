/**
 * MobileBottomBar
 *
 * Shows only on small screens (< 768px).
 * Three toggle buttons: Datos (LeftPanel), Exportar (RightPanel), Biblioteca (Library).
 * One click → show, another click → hide.
 *
 * Props:
 *   activePanel   – "datos" | "exportar" | "biblioteca" | null
 *   onToggle(p)   – called when a button is pressed
 *   activeView    – "workspace" | "library"   (from App)
 *   onLibrary()   – switches to library view in App
 */
export default function MobileBottomBar({ activePanel, onToggle, activeView, onLibrary }) {
  const buttons = [
    {
      id: "datos",
      icon: "straighten",
      label: "Datos",
    },
    {
      id: "exportar",
      icon: "download",
      label: "Exportar",
    },
    {
      id: "biblioteca",
      icon: "folder_open",
      label: "Biblioteca",
    },
  ];

  const handlePress = (id) => {
    if (id === "biblioteca") {
      // If not already on library, switch view AND open the biblioteca panel
      onLibrary?.();
    }
    onToggle(id);
  };

  return (
    <nav className="mobile-bottom-bar" aria-label="Navegación móvil">
      {buttons.map((btn) => {
        const isActive =
          btn.id === "biblioteca"
            ? activePanel === "biblioteca" && activeView === "library"
            : activePanel === btn.id;
        return (
          <button
            key={btn.id}
            id={`mob-btn-${btn.id}`}
            className={`mobile-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => handlePress(btn.id)}
            aria-pressed={isActive}
          >
            <span className="mobile-tab-icon">
              <span className="material-symbols-outlined">{btn.icon}</span>
              {isActive && <span className="mobile-tab-dot" />}
            </span>
            <span className="mobile-tab-label">{btn.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
