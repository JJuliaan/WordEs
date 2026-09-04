import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // El dominio del túnel de Cloudflare cambia cada vez que lo reiniciás,
    // así que le decimos a Vite que confíe en cualquier host mientras
    // estamos en desarrollo (esto NUNCA se usa así en producción real).
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    // El servidor de Python corre aparte, en el puerto 8000.
    // Estas dos líneas hacen que /api y /ws "salten" para allá,
    // así solo necesitamos UN túnel público apuntando a Vite.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
