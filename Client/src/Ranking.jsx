// El servidor ya lo manda ordenado (más puntos primero, empatan por victorias).
export default function Ranking({ ranking }) {
  if (!ranking || ranking.length === 0) return null;

  return (
    <div className="panel ranking">
      <h2 className="subtitulo">Ranking de la sesión</h2>
      <ol className="lista-ranking">
        {ranking.map((fila, i) => (
          <li className="fila-ranking" key={fila.id}>
            <span className="ranking-puesto">{i + 1}</span>
            {fila.avatar ? (
              <img className="avatar-chico" src={fila.avatar} alt="" />
            ) : (
              <div className="avatar-chico avatar-vacio" />
            )}
            <span className="ranking-nombre">{fila.nombre}</span>
            <span className="ranking-puntos">{fila.puntos} pts</span>
            <span className="ranking-victorias">
              {fila.victorias} {fila.victorias === 1 ? "victoria" : "victorias"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
