import { discordSdk, obtenerAvatarUrl } from "./discordSdk.js";

// El instanceId es el mismo para todos los que están jugando esta Activity
// juntos, así que sirve como "código de sala" automático. Le mandamos
// nuestro id/nombre/avatar por query string para que el servidor sepa
// quiénes somos (cada uno tiene su propio tablero en esa sala) — no hay un
// mensaje de "join" aparte, la identidad viaja en la URL de conexión.
export function conectarGameSocket(usuario, { onMensaje }) {
  const avatar = obtenerAvatarUrl(usuario);
  const parametros = new URLSearchParams({
    user_id: usuario.id,
    username: usuario.global_name || usuario.username || "Jugador",
    avatar: avatar ?? "",
  });
  const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(
    `${protocolo}://${window.location.host}/ws/${discordSdk.instanceId}?${parametros.toString()}`
  );

  ws.onmessage = (evento) => onMensaje(JSON.parse(evento.data));

  return ws;
}

export function enviarIntento(ws, palabra) {
  ws?.send(JSON.stringify({ tipo: "intento", palabra }));
}

export function pedirPista(ws) {
  ws?.send(JSON.stringify({ tipo: "pista" }));
}

export function pedirNuevaPartida(ws) {
  ws?.send(JSON.stringify({ tipo: "nueva_partida" }));
}
