export default function Pistas({ pistas }) {
  if (!pistas || pistas.length === 0) return null;

  const ordenadas = [...pistas].sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="pistas">
      {ordenadas.map((pista) => (
        <span className="pista-chip" key={pista.posicion}>
          Posición {pista.posicion + 1}: <strong>{pista.letra}</strong>
        </span>
      ))}
    </div>
  );
}
