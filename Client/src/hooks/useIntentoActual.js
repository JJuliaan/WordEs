import { useState } from "react";
import { LONGITUD_PALABRA_POR_DEFECTO } from "../config/constantes.js";

// Buffer local de la palabra que se está escribiendo (todavía no enviada).
// `onEnviar` es quien realmente manda el intento por el WebSocket.
export function useIntentoActual(estado, onEnviar) {
  const [intentoActual, setIntentoActual] = useState("");
  const longitud = estado?.longitudPalabra ?? LONGITUD_PALABRA_POR_DEFECTO;

  function agregarLetra(letra) {
    if (estado?.propio?.finalizado || estado?.cargando) return;
    setIntentoActual((actual) => (actual.length < longitud ? actual + letra : actual));
  }

  function borrarLetra() {
    setIntentoActual((actual) => actual.slice(0, -1));
  }

  function enviarIntento() {
    if (intentoActual.length !== longitud) return;
    onEnviar(intentoActual);
    setIntentoActual("");
  }

  function limpiar() {
    setIntentoActual("");
  }

  return { intentoActual, agregarLetra, borrarLetra, enviarIntento, limpiar };
}
