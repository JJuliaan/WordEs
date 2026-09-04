// El servidor ya lo manda ordenado (más puntos primero, empatan por victorias).
// `detallado` agrega victorias/rondas/mejor ronda debajo del nombre — se usa
// dentro del modal de ranking completo; la vista compacta (RankingTop3) no
// lo necesita.
export default function Ranking({ ranking, detallado = false }) {
  if (!ranking || ranking.length === 0) {
    return <p className="ranking-vacio">Todavía nadie sumó puntos en esta sesión.</p>;
  }

  return (
    <ol className="lista-ranking">
      {ranking.map((fila, i) => (
        <li className="fila-ranking" key={fila.id}>
          <span className="ranking-puesto">{i + 1}</span>
          {fila.avatar ? (
            <img className="avatar-chico" src={fila.avatar} alt="" />
          ) : (
            <div className="avatar-chico avatar-vacio" />
          )}
          <div className="ranking-info">
            <span className="ranking-nombre">{fila.nombre}</span>
            {detallado && (
              <span className="ranking-detalle">
                {fila.victorias} {fila.victorias === 1 ? "victoria" : "victorias"} ·{" "}
                {fila.rondasJugadas} {fila.rondasJugadas === 1 ? "ronda" : "rondas"} · mejor ronda{" "}
                {fila.mejorRonda} pts
              </span>
            )}
          </div>
          <span className="ranking-puntos">{fila.puntos} pts</span>
        </li>
      ))}
    </ol>
  );
}
