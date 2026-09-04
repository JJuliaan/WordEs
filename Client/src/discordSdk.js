import { DiscordSDK } from "@discord/embedded-app-sdk";

// El Client ID es público (no es un secreto), Discord lo necesita para
// saber a qué Activity pertenece este iframe.
export const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
