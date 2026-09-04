export default function ResumenRonda({ desglose, gano }) {
  if (!desglose) return null;

  return (
    <div className="resumen-ronda">
      <p className="resumen-total">
        {gano ? "Ganaste esta ronda." : "No llegaste a tiempo."} Sumaste{" "}
        <strong>{desglose.total} puntos</strong>.
      </p>
      <ul className="resumen-detalle">
        <li>
          {desglose.verdes} {desglose.verdes === 1 ? "letra verde" : "letras verdes"}: +
          {desglose.puntosVerdes} pts
        </li>
        <li>
          {desglose.amarillos} {desglose.amarillos === 1 ? "letra amarilla" : "letras amarillas"}: +
          {desglose.puntosAmarillos} pts
        </li>
        {desglose.bonusVictoria > 0 && <li>Bonus por acertar la palabra: +{desglose.bonusVictoria} pts</li>}
        {desglose.bonusIntentos > 0 && (
          <li>Bonus por intentos que te sobraron: +{desglose.bonusIntentos} pts</li>
        )}
        {desglose.costoPistas > 0 && (
          <li>
            Costo de {desglose.pistasUsadas} {desglose.pistasUsadas === 1 ? "pista" : "pistas"}: −
            {desglose.costoPistas} pts
          </li>
        )}
      </ul>
    </div>
  );
}
