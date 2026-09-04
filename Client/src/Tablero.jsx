const MAX_INTENTOS_POR_DEFECTO = 8;

export default function Tablero({ partida, intentoActual }) {
  const intentos = partida?.intentos ?? [];
  const maxFilas = partida?.maxIntentos ?? MAX_INTENTOS_POR_DEFECTO;
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
      const letras = intentoActual.padEnd(5, " ").split("");
      filas.push(
        <div className="fila" key={i}>
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
          {[0, 1, 2, 3, 4].map((j) => (
            <div className="celda" key={j} />
          ))}
        </div>
      );
    }
  }

  return <div className="tablero">{filas}</div>;
}
