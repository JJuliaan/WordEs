import { FILAS_TECLADO, PRIORIDAD_TECLA } from "../config/constantes.js";

function calcularEstadoTeclas(partida) {
  const estado = {};
  for (const intento of partida?.intentos ?? []) {
    intento.palabra.split("").forEach((letra, i) => {
      const nuevoEstado = intento.resultado[i];
      if (!estado[letra] || PRIORIDAD_TECLA[nuevoEstado] > PRIORIDAD_TECLA[estado[letra]]) {
        estado[letra] = nuevoEstado;
      }
    });
  }
  return estado;
}

export default function Teclado({ partida, onLetra, onBorrar, onEnter }) {
  const estados = calcularEstadoTeclas(partida);

  return (
    <div className="teclado">
      {FILAS_TECLADO.map((fila, i) => (
        <div className="fila-teclado" key={i}>
          {i === 2 && (
            <button className="tecla tecla-ancha" onClick={onEnter}>
              ENTER
            </button>
          )}

          {fila.split("").map((letra) => (
            <button
              key={letra}
              className={`tecla ${estados[letra] ?? ""}`}
              onClick={() => onLetra(letra)}
            >
              {letra}
            </button>
          ))}

          {i === 2 && (
            <button className="tecla tecla-ancha" onClick={onBorrar}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
