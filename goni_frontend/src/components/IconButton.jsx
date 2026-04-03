import React from "react";

/**
 * IconButton
 * Unifica el diseño de botones de acción secundarios (con o sin texto).
 * Al hacer hover se transforman con un brillo azul eléctrico moderno.
 */
export default function IconButton({ 
  icon, 
  text, 
  onClick, 
  disabled, 
  title,
  className = "" 
}) {
  return (
    <button 
      className={`icon-action-btn ${className} ${!text ? 'icon-only' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {text && <span>{text}</span>}
    </button>
  );
}
