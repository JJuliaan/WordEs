import { useEffect, useRef, useState } from "react";
import { autenticarConDiscord } from "../services/discordAuth.js";
import {
  conectarGameSocket,
  enviarIntento as enviarIntentoWs,
  pedirPista as pedirPistaWs,
  pedirNuevaPartida as pedirNuevaPartidaWs,
} from "../services/gameSocket.js";
import { DURACION_NOTIFICACION_MS, DURACION_ERROR_INTENTO_MS } from "../config/constantes.js";

// Maneja todo el ciclo de vida de la conexión: el handshake de Discord, el
// WebSocket del juego, y el despacho de los mensajes que manda el servidor
// ("estado", "evento", "resumen_ronda", "error") a estado de React.
export function useConexionJuego() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState(null);
  const [errorIntento, setErrorIntento] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [resumenRonda, setResumenRonda] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    async function conectar() {
      try {
        const usuarioAutenticado = await autenticarConDiscord();
        setUsuario(usuarioAutenticado);

        const ws = conectarGameSocket(usuarioAutenticado, {
          onMensaje(mensaje) {
            if (mensaje.tipo === "estado") {
              setEstado(mensaje);
              if (mensaje.propio.intentos.length === 0) {
                // Arrancó una ronda nueva (la haya pedido este jugador u otro).
                setResumenRonda(null);
              }
            } else if (mensaje.tipo === "evento") {
              const id = crypto.randomUUID();
              setNotificaciones((actuales) => [...actuales, { id, ...mensaje }]);
              setTimeout(() => {
                setNotificaciones((actuales) => actuales.filter((n) => n.id !== id));
              }, DURACION_NOTIFICACION_MS);
            } else if (mensaje.tipo === "resumen_ronda") {
              setResumenRonda(mensaje.desglose);
            } else if (mensaje.tipo === "error") {
              setErrorIntento(mensaje.mensaje);
              setTimeout(() => setErrorIntento(null), DURACION_ERROR_INTENTO_MS);
            }
          },
        });

        wsRef.current = ws;
        setListo(true);
      } catch (err) {
        console.error(err);
        setError("No se pudo conectar con Discord. Revisá la consola para más detalles.");
      }
    }

    conectar();
  }, []);

  function enviarIntento(palabra) {
    enviarIntentoWs(wsRef.current, palabra);
  }

  function pedirPista() {
    pedirPistaWs(wsRef.current);
  }

  function nuevaPartida() {
    pedirNuevaPartidaWs(wsRef.current);
  }

  return {
    listo,
    error,
    usuario,
    estado,
    errorIntento,
    notificaciones,
    resumenRonda,
    enviarIntento,
    pedirPista,
    nuevaPartida,
  };
}
