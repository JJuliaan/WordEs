import { DiscordSDK } from "@discord/embedded-app-sdk";
import { DISCORD_CLIENT_ID, DISCORD_CDN_AVATAR_TAMANO } from "../config/discord.js";

export const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);

// Arma la URL pública del avatar de Discord a partir del usuario autenticado.
// Tanto el id como el hash del avatar son datos públicos (no secretos), así
// que se pueden mandar tal cual al servidor y a los demás jugadores.
export function obtenerAvatarUrl(usuario) {
  if (!usuario?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${usuario.id}/${usuario.avatar}.png?size=${DISCORD_CDN_AVATAR_TAMANO}`;
}
