import { useEffect, useRef, useState } from "react";
import { discordSdk } from "./discordSdk.js";
import Tablero from "./Tablero.jsx";
import Teclado from "./Teclado.jsx";

export default function App() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [partida, setPartida] = useState(null);
  const [intentoActual, setIntentoActual] = useState("");
  const wsRef = useRef(null);

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
        //    mismo para todos los que están jugando esta Activity juntos,
        //    así que sirve como "código de sala" automático.
        const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${protocolo}://${window.location.host}/ws/${discordSdk.instanceId}`);

        ws.onmessage = (evento) => {
          setPartida(JSON.parse(evento.data));
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

  function agregarLetra(letra) {
    if (partida?.finalizada) return;
    setIntentoActual((actual) => (actual.length < 5 ? actual + letra : actual));
  }

  function borrarLetra() {
    setIntentoActual((actual) => actual.slice(0, -1));
  }

  function enviarIntento() {
    if (intentoActual.length !== 5 || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({
        tipo: "intento",
        palabra: intentoActual,
        autor: usuario?.username ?? "Jugador",
      })
    );
    setIntentoActual("");
  }

  function nuevaPartida() {
    wsRef.current?.send(JSON.stringify({ tipo: "nueva_partida" }));
    setIntentoActual("");
  }

  if (error) {
    return <div className="pantalla-centrada">{error}</div>;
  }

  if (!listo) {
    return <div className="pantalla-centrada">Conectando con Discord…</div>;
  }

  return (
    <div className="app">
      <h1 className="titulo">🟩 Wordle</h1>

      <Tablero partida={partida} intentoActual={intentoActual} />

      {(!partida || partida.finalizada) ? (
        <button className="boton-nueva-partida" onClick={nuevaPartida}>
          🎮 {partida?.finalizada ? "Jugar de nuevo" : "Nueva partida"}
        </button>
      ) : (
        <Teclado
          partida={partida}
          onLetra={agregarLetra}
          onBorrar={borrarLetra}
          onEnter={enviarIntento}
        />
      )}

      {partida?.finalizada && (
        <p className="mensaje-final">
          {partida.ganador ? `🎉 ¡${partida.ganador} adivinó la palabra!` : "😔 Se acabaron los intentos."}
          {" "}La palabra era <strong>{partida.palabra}</strong>.
        </p>
      )}
    </div>
  );
}
