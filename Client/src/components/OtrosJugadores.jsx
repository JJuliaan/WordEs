import { LONGITUD_PALABRA_POR_DEFECTO } from "../config/constantes.js";

// Muestra el progreso de los demás jugadores: sólo los colores de cada
// intento (verde/amarillo/gris), nunca las letras que escribieron.
export default function OtrosJugadores({ jugadores, propioId, maxIntentos, longitudPalabra }) {
  const longitud = longitudPalabra ?? LONGITUD_PALABRA_POR_DEFECTO;
  const otros = (jugadores ?? []).filter((jugador) => jugador.id !== propioId);

  if (otros.length === 0) return null;

  return (
    <div className="panel otros-jugadores">
      <h2 className="subtitulo">Otros jugadores</h2>
      <div className="lista-otros">
        {otros.map((jugador) => (
          <div className="tarjeta-jugador" key={jugador.id}>
            <div className="tarjeta-jugador-header">
              {jugador.avatar ? (
                <img className="avatar-chico" src={jugador.avatar} alt="" />
              ) : (
                <div className="avatar-chico avatar-vacio" />
              )}
              <span className="tarjeta-jugador-nombre">{jugador.nombre}</span>
              {jugador.gano && <span className="etiqueta etiqueta-gano">Ganó</span>}
              {!jugador.gano && jugador.finalizado && (
                <span className="etiqueta etiqueta-perdio">Sin intentos</span>
              )}
            </div>

            <div className="mini-tablero">
              {Array.from({ length: maxIntentos }).map((_, i) => {
                const resultado = jugador.resultados[i];
                return (
                  <div className="mini-fila" key={i}>
                    {resultado
                      ? resultado.map((estado, j) => <span className={`mini-celda ${estado}`} key={j} />)
                      : Array.from({ length: longitud }).map((_, j) => <span className="mini-celda" key={j} />)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
