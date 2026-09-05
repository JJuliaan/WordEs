import { MAX_INTENTOS_POR_DEFECTO, LONGITUD_PALABRA_POR_DEFECTO } from "../config/constantes.js";

export default function Tablero({ propio, maxIntentos, longitudPalabra, intentoActual, filaConError }) {
  const intentos = propio?.intentos ?? [];
  const maxFilas = maxIntentos ?? MAX_INTENTOS_POR_DEFECTO;
  const longitud = longitudPalabra ?? LONGITUD_PALABRA_POR_DEFECTO;
  const filas = [];

  for (let i = 0; i < maxFilas; i++) {
    if (i < intentos.length) {
      // Fila ya jugada: mostramos el resultado con colores
      const intento = intentos[i];
      filas.push(
        <div className="fila" key={i}>
          {intento.palabra.split("").map((letra, j) => (
            <div className={`celda ${intento.resultado[j]}`} key={j}>
              {letra}
            </div>
          ))}
        </div>
      );
    } else if (i === intentos.length) {
      // Fila donde se está escribiendo ahora
      const letras = intentoActual.padEnd(longitud, " ").split("");
      filas.push(
        <div className={`fila ${filaConError ? "fila-error" : ""}`} key={i}>
          {letras.map((letra, j) => (
            <div className={`celda ${letra.trim() ? "actual" : ""}`} key={j}>
              {letra.trim()}
            </div>
          ))}
        </div>
      );
    } else {
      // Filas vacías todavía no jugadas
      filas.push(
        <div className="fila" key={i}>
          {Array.from({ length: longitud }).map((_, j) => (
            <div className="celda" key={j} />
          ))}
        </div>
      );
    }
  }

  return <div className="tablero">{filas}</div>;
}
