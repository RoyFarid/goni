import React from "react";

/**
 * ConfirmModal
 * Un modal de confirmación reusable y moderno.
 * 
 * @param {boolean} isOpen - Controla la visibilidad del modal
 * @param {string} title - Título del modal
 * @param {string} type - 'danger' | 'warning' | 'info' (determina los colores y el ícono superior)
 * @param {string} confirmText - Texto del botón primario
 * @param {string} cancelText - Texto del botón secundario
 * @param {function} onConfirm - Función a ejecutar al confirmar
 * @param {function} onCancel - Función a ejecutar al cancelar
 * @param {ReactNode} children - El mensaje o cuerpo personalizado del modal
 */
export default function ConfirmModal({
  isOpen,
  title,
  type = "danger",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  children
}) {
  if (!isOpen) return null;

  const config = {
    danger: {
      color: "#ff3131",
      bg: "rgba(255, 49, 49, 0.15)",
      icon: "warning",
      btnShadow: "rgba(255, 49, 49, 0.3)",
      btnIcon: "delete"
    },
    warning: {
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.25)",
      icon: "error_outline",
      btnShadow: "rgba(245, 158, 11, 0.3)",
      btnIcon: "check"
    },
    info: {
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.25)",
      icon: "info",
      btnShadow: "rgba(59, 130, 246, 0.3)",
      btnIcon: "check"
    }
  };

  const theme = config[type] || config.info;

  return (
    <div className="plans-modal-overlay" style={{ zIndex: 1000 }}>
      {/* Usamos el mismo diseño premium de las tarjetas de login/plan */}
      <div className="login-card" style={{ animation: "modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both", border: `1px solid ${theme.bg}` }}>
        <div className="login-header">
          <div className="login-logo" style={{ background: theme.bg, color: theme.color }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
              {theme.icon}
            </span>
          </div>
          <h2>{title}</h2>
          <div style={{ fontSize: "14px", marginTop: "8px", color: "var(--on-surface-variant)", lineHeight: "1.5" }}>
            {children}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className="btn-primary"
            style={{
              flex: 1,
              background: theme.color,
              border: "none",
              boxShadow: `0 3px 12px ${theme.btnShadow}`
            }}
            onClick={onConfirm}
          >
            <span className="material-symbols-outlined">{theme.btnIcon}</span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
