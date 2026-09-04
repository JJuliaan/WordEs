import { useEffect, useRef, useState } from "react";
import { discordSdk, obtenerAvatarUrl } from "./discordSdk.js";
import Tablero from "./Tablero.jsx";
import Teclado from "./Teclado.jsx";
import OtrosJugadores from "./OtrosJugadores.jsx";
import RankingTop3 from "./RankingTop3.jsx";
import RankingDetallado from "./RankingDetallado.jsx";
import Notificaciones from "./Notificaciones.jsx";
import Confeti from "./Confeti.jsx";
import Configuracion from "./Configuracion.jsx";
import Pistas from "./Pistas.jsx";
import BotonPista from "./BotonPista.jsx";
import ResumenRonda from "./ResumenRonda.jsx";

const TECLAS_LETRA = /^[A-ZÑ]$/;
const CLAVE_TEMA = "wordes-tema";

function obtenerTemaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    // localStorage puede no estar disponible (ej. almacenamiento bloqueado)
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "claro" : "oscuro";
}

export default function App() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState(null);
  const [intentoActual, setIntentoActual] = useState("");
  const [errorIntento, setErrorIntento] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [confetiActivo, setConfetiActivo] = useState(false);
  const [resumenRonda, setResumenRonda] = useState(null);
  const [tema, setTema] = useState(obtenerTemaInicial);
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);
  const wsRef = useRef(null);
  const ganoAnteriorRef = useRef(false);

  // Tema claro/oscuro: se aplica como atributo en <html> (así lo puede leer
  // el CSS) y se guarda para la próxima vez. index.html ya lo aplica una
  // vez al cargar la página para evitar el parpadeo del tema equivocado.
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // sin almacenamiento disponible no pasa nada grave, sólo no persiste
    }
  }, [tema]);

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
            if (mensaje.propio.intentos.length === 0) {
              // Arrancó una ronda nueva (la haya pedido este jugador u otro).
              setResumenRonda(null);
            }
          } else if (mensaje.tipo === "evento") {
            const id = crypto.randomUUID();
            setNotificaciones((actuales) => [...actuales, { id, ...mensaje }]);
            setTimeout(() => {
              setNotificaciones((actuales) => actuales.filter((n) => n.id !== id));
            }, 4000);
          } else if (mensaje.tipo === "resumen_ronda") {
            setResumenRonda(mensaje.desglose);
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

  function pedirPista() {
    wsRef.current?.send(JSON.stringify({ tipo: "pista" }));
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

      {configuracionAbierta && (
        <Configuracion tema={tema} onCambiarTema={setTema} onCerrar={() => setConfiguracionAbierta(false)} />
      )}

      {rankingAbierto && (
        <RankingDetallado ranking={estado.ranking} onCerrar={() => setRankingAbierto(false)} />
      )}

      <header className="encabezado">
        <h1 className="titulo">WordEs</h1>
        <button
          className="boton-icono"
          onClick={() => setConfiguracionAbierta(true)}
          aria-label="Configuración"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <div className="diseño">
        <aside className="columna columna-izquierda">
          <OtrosJugadores jugadores={estado.jugadores} propioId={usuario?.id} maxIntentos={estado.maxIntentos} />
        </aside>

        <main className="columna columna-centro">
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

              <Pistas pistas={estado.propio.pistas} />

              {errorIntento && <p className="mensaje-error">{errorIntento}</p>}

              {estado.propio.finalizado ? (
                <>
                  <ResumenRonda desglose={resumenRonda} gano={estado.propio.gano} />
                  <button className="boton-nueva-partida" onClick={nuevaPartida}>
                    Nueva partida
                  </button>
                  <p className="mensaje-final">
                    La palabra era <strong>{estado.palabra}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <BotonPista
                    pistasUsadas={estado.propio.pistasUsadas}
                    pistasDisponibles={estado.propio.pistasDisponibles}
                    onPedir={pedirPista}
                  />
                  <Teclado
                    partida={estado.propio}
                    onLetra={agregarLetra}
                    onBorrar={borrarLetra}
                    onEnter={enviarIntento}
                  />
                </>
              )}
            </>
          )}
        </main>

        <aside className="columna columna-derecha">
          <RankingTop3 ranking={estado.ranking} onVerDetalle={() => setRankingAbierto(true)} />
        </aside>
      </div>
    </div>
  );
}
