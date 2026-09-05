import { useEffect } from "react";
import { TECLAS_LETRA } from "../config/constantes.js";

// Soporte de teclado físico: letras, Enter y Backspace hacen lo mismo que
// tocar el teclado en pantalla.
export function useTecladoFisico(listo, { onLetra, onBorrar, onEnter }) {
  useEffect(() => {
    function manejarTecla(evento) {
      if (!listo || evento.ctrlKey || evento.metaKey || evento.altKey) return;

      if (evento.key === "Enter") {
        onEnter();
      } else if (evento.key === "Backspace") {
        onBorrar();
      } else {
        const tecla = evento.key.toUpperCase();
        if (TECLAS_LETRA.test(tecla)) {
          onLetra(tecla);
        }
      }
    }

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [listo, onLetra, onBorrar, onEnter]);
}
