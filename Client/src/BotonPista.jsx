// El costo real lo calcula y lo cobra el servidor (ver Server/main.py,
// costo_total_pistas); acá sólo lo mostramos de antemano para que el
// jugador sepa cuánto le va a costar la próxima pista antes de pedirla.
const COSTO_BASE_PISTA = 15;

export default function BotonPista({ pistasUsadas, pistasDisponibles, onPedir }) {
  if (pistasDisponibles <= 0) {
    return <p className="pistas-agotadas">Ya usaste todas tus pistas de esta ronda.</p>;
  }

  const costoSiguiente = COSTO_BASE_PISTA * (pistasUsadas + 1);

  return (
    <button className="boton-pista" onClick={onPedir}>
      Pedir pista (−{costoSiguiente} pts) · Quedan {pistasDisponibles}
    </button>
  );
}
