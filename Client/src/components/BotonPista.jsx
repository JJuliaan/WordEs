// El costo real lo calcula y lo cobra el servidor (ver Server/puntaje.py,
// costo_pista_individual) y viaja en propio.costoProximaPista — acá sólo lo
// mostramos, nunca lo recalculamos, para no duplicar esa regla de negocio.
export default function BotonPista({ pistasDisponibles, costoProximaPista, onPedir }) {
  if (pistasDisponibles <= 0) {
    return <p className="pistas-agotadas">Ya usaste todas tus pistas de esta ronda.</p>;
  }

  return (
    <button className="boton-pista" onClick={onPedir}>
      Pedir pista (−{costoProximaPista} pts) · Quedan {pistasDisponibles}
    </button>
  );
}
