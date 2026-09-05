import { useEffect, useRef, useState } from "react";

// Dispara el confeti cuando TU tablero pasa a "ganado" (no cuando ya venías
// ganado) — el ref detecta el flanco false -> true así sólo dispara una vez.
export function useConfetiVictoria(gano) {
  const [activo, setActivo] = useState(false);
  const ganoAnteriorRef = useRef(false);

  useEffect(() => {
    const ganoAhora = gano ?? false;
    if (ganoAhora && !ganoAnteriorRef.current) {
      setActivo(true);
    }
    ganoAnteriorRef.current = ganoAhora;
  }, [gano]);

  function finalizar() {
    setActivo(false);
  }

  return { activo, finalizar };
}
