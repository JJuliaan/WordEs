import { discordSdk } from "./discordSdk.js";
import { DISCORD_CLIENT_ID, DISCORD_OAUTH_SCOPE } from "../config/discord.js";

// Secuencia completa del handshake embebido de Discord. El orden importa y
// no se puede saltear ningún paso (así lo exige el SDK):
// 1) avisarle a Discord que el iframe ya cargó
// 2) pedirle autorización al usuario (da un "code" de OAuth)
// 3) mandar ese code a NUESTRO servidor, que lo cambia por un access_token
//    hablando directo con Discord (con el client_secret, que nunca puede
//    estar en el navegador)
// 4) autenticarse ante el SDK con ese token
export async function autenticarConDiscord() {
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: DISCORD_OAUTH_SCOPE,
  });

  const respuesta = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token: accessToken } = await respuesta.json();

  const auth = await discordSdk.commands.authenticate({ access_token: accessToken });
  return auth.user;
}
