import Modal from "./Modal.jsx";

// Cada opción de configuración es una fila dentro de "lista-config", para
// que agregar una opción nueva en el futuro sea sumar otra fila acá adentro.
export default function Configuracion({ tema, onCambiarTema, onCerrar }) {
  return (
    <Modal titulo="Configuración" onCerrar={onCerrar}>
      <div className="lista-config">
        <div className="fila-config">
          <span className="config-etiqueta">Tema</span>
          <div className="selector-tema">
            <button
              className={`opcion-tema ${tema === "oscuro" ? "activa" : ""}`}
              onClick={() => onCambiarTema("oscuro")}
            >
              Oscuro
            </button>
            <button
              className={`opcion-tema ${tema === "claro" ? "activa" : ""}`}
              onClick={() => onCambiarTema("claro")}
            >
              Claro
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
