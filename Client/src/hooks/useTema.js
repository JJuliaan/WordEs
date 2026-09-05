import { useEffect, useState } from "react";
import { CLAVE_TEMA } from "../config/constantes.js";

function obtenerTemaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    // localStorage puede no estar disponible (ej. almacenamiento bloqueado)
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "claro" : "oscuro";
}

// Tema claro/oscuro: se aplica como atributo en <html> (así lo puede leer el
// CSS) y se guarda para la próxima vez. index.html ya lo aplica una vez al
// cargar la página para evitar el parpadeo del tema equivocado.
export function useTema() {
  const [tema, setTema] = useState(obtenerTemaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // sin almacenamiento disponible no pasa nada grave, sólo no persiste
    }
  }, [tema]);

  return [tema, setTema];
}
