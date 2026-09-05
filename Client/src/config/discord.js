// El Client ID es público (no es un secreto), Discord lo necesita para saber
// a qué Activity pertenece este iframe. Viene de Client/.env (VITE_DISCORD_CLIENT_ID).
export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

export const DISCORD_OAUTH_SCOPE = ["identify"];

export const DISCORD_CDN_AVATAR_TAMANO = 64;
