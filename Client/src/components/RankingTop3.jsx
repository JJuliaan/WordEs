export default function RankingTop3({ ranking, onVerDetalle }) {
  const top3 = (ranking ?? []).slice(0, 3);

  return (
    <div className="panel ranking-top3">
      <h2 className="subtitulo">Top de la sesión</h2>

      {top3.length === 0 ? (
        <p className="ranking-vacio">Todavía nadie sumó puntos.</p>
      ) : (
        <ol className="lista-top3">
          {top3.map((fila, i) => (
            <li className="fila-top3" key={fila.id}>
              <span className="top3-puesto">{i + 1}</span>
              {fila.avatar ? (
                <img className="avatar-chico" src={fila.avatar} alt="" />
              ) : (
                <div className="avatar-chico avatar-vacio" />
              )}
              <span className="top3-nombre">{fila.nombre}</span>
              <span className="top3-puntos">{fila.puntos}</span>
            </li>
          ))}
        </ol>
      )}

      <button className="boton-secundario" onClick={onVerDetalle}>
        Ver ranking completo
      </button>
    </div>
  );
}
