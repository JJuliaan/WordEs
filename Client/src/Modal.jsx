// Caparazón compartido por los modales de la app (configuración, ranking
// detallado): fondo oscurecido + caja centrada + botón de cerrar. Clickear el
// fondo cierra el modal; clickear adentro de la caja no (por eso el
// stopPropagation).
export default function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(evento) => evento.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-contenido">{children}</div>
      </div>
    </div>
  );
}
