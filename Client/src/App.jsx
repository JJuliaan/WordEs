import { useEffect, useRef, useState } from "react";
import { discordSdk, obtenerAvatarUrl } from "./discordSdk.js";
import Tablero from "./Tablero.jsx";
import Teclado from "./Teclado.jsx";
import OtrosJugadores from "./OtrosJugadores.jsx";
import Ranking from "./Ranking.jsx";
import Notificaciones from "./Notificaciones.jsx";
import Confeti from "./Confeti.jsx";

const TECLAS_LETRA = /^[A-ZÑ]$/;

export default function App() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState(null);
  const [intentoActual, setIntentoActual] = useState("");
  const [errorIntento, setErrorIntento] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [confetiActivo, setConfetiActivo] = useState(false);
  const wsRef = useRef(null);
  const ganoAnteriorRef = useRef(false);

  useEffect(() => {
    async function conectar() {
      try {
        // 1) Avisarle a Discord que el iframe ya cargó
        await discordSdk.ready();

        // 2) Pedirle al usuario autorización (esto abre el diálogo
        //    "Esta app quiere acceder a tu identidad" la primera vez)
        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify"],
        });

        // 3) Mandar ese código a NUESTRO servidor, que lo cambia por un
        //    access_token hablando directo con Discord (con el client_secret,
        //    que nunca puede estar en el navegador)
        const respuesta = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const { access_token: accessToken } = await respuesta.json();

        // 4) Autenticarse ante el SDK con ese token
        const auth = await discordSdk.commands.authenticate({ access_token: accessToken });
        setUsuario(auth.user);

        // 5) Conectar al WebSocket de nuestro servidor. El instanceId es el
        //    mismo para todos los que están jugando esta Activity juntos, así
        //    que sirve como "código de sala" automático. Le mandamos nuestro
        //    id/nombre/avatar por query string para que el servidor sepa
        //    quiénes somos (cada uno tiene su propio tablero en esa sala).
        const avatar = obtenerAvatarUrl(auth.user);
        const parametros = new URLSearchParams({
          user_id: auth.user.id,
          username: auth.user.global_name || auth.user.username || "Jugador",
          avatar: avatar ?? "",
        });
        const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(
          `${protocolo}://${window.location.host}/ws/${discordSdk.instanceId}?${parametros.toString()}`
        );

        ws.onmessage = (evento) => {
          const mensaje = JSON.parse(evento.data);

          if (mensaje.tipo === "estado") {
            setEstado(mensaje);
          } else if (mensaje.tipo === "evento") {
            const id = crypto.randomUUID();
            setNotificaciones((actuales) => [...actuales, { id, ...mensaje }]);
            setTimeout(() => {
              setNotificaciones((actuales) => actuales.filter((n) => n.id !== id));
            }, 4000);
          } else if (mensaje.tipo === "error") {
            setErrorIntento(mensaje.mensaje);
            setTimeout(() => setErrorIntento(null), 2000);
          }
        };

        wsRef.current = ws;
        setListo(true);
      } catch (err) {
        console.error(err);
        setError("No se pudo conectar con Discord. Revisá la consola para más detalles.");
      }
    }

    conectar();
  }, []);

  // Confeti cuando TU tablero pasa a "ganado" (no cuando ya venías ganado).
  useEffect(() => {
    const ganoAhora = estado?.propio?.gano ?? false;
    if (ganoAhora && !ganoAnteriorRef.current) {
      setConfetiActivo(true);
    }
    ganoAnteriorRef.current = ganoAhora;
  }, [estado?.propio?.gano]);

  function agregarLetra(letra) {
    if (estado?.propio?.finalizado || estado?.cargando) return;
    setIntentoActual((actual) => (actual.length < 5 ? actual + letra : actual));
  }

  function borrarLetra() {
    setIntentoActual((actual) => actual.slice(0, -1));
  }

  function enviarIntento() {
    if (intentoActual.length !== 5 || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ tipo: "intento", palabra: intentoActual }));
    setIntentoActual("");
  }

  function nuevaPartida() {
    wsRef.current?.send(JSON.stringify({ tipo: "nueva_partida" }));
    setIntentoActual("");
  }

  // Soporte de teclado físico: letras, Enter y Backspace hacen lo mismo que
  // tocar el teclado en pantalla.
  useEffect(() => {
    function manejarTecla(evento) {
      if (!listo || evento.ctrlKey || evento.metaKey || evento.altKey) return;

      if (evento.key === "Enter") {
        enviarIntento();
      } else if (evento.key === "Backspace") {
        borrarLetra();
      } else {
        const tecla = evento.key.toUpperCase();
        if (TECLAS_LETRA.test(tecla)) {
          agregarLetra(tecla);
        }
      }
    }

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [listo, estado, intentoActual]);

  if (error) {
    return <div className="pantalla-centrada">{error}</div>;
  }

  if (!listo || !estado) {
    return <div className="pantalla-centrada">Conectando con Discord…</div>;
  }

  return (
    <div className="app">
      <Confeti activo={confetiActivo} onFin={() => setConfetiActivo(false)} />
      <Notificaciones notificaciones={notificaciones} />

      <h1 className="titulo">Wordle</h1>

      {estado.cargando || !estado.propio ? (
        <p className="mensaje-cargando">Buscando una palabra nueva…</p>
      ) : (
        <>
          <Tablero
            propio={estado.propio}
            maxIntentos={estado.maxIntentos}
            intentoActual={intentoActual}
            filaConError={!!errorIntento}
          />

          {errorIntento && <p className="mensaje-error">{errorIntento}</p>}

          {estado.propio.finalizado ? (
            <>
              <button className="boton-nueva-partida" onClick={nuevaPartida}>
                Nueva partida
              </button>
              <p className="mensaje-final">
                {estado.propio.gano ? "Adivinaste la palabra." : "Se acabaron tus intentos."} La
                palabra era <strong>{estado.palabra}</strong>.
              </p>
            </>
          ) : (
            <Teclado partida={estado.propio} onLetra={agregarLetra} onBorrar={borrarLetra} onEnter={enviarIntento} />
          )}
        </>
      )}

      <OtrosJugadores jugadores={estado.jugadores} propioId={usuario?.id} maxIntentos={estado.maxIntentos} />
      <Ranking ranking={estado.ranking} />
    </div>
  );
}
