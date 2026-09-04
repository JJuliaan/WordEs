// SOLO PARA VERIFICACIÓN VISUAL MANUAL — no forma parte de la app, se borra
// después de revisar el layout en el navegador.
import { useState } from "react";
import Tablero from "./Tablero.jsx";
import Teclado from "./Teclado.jsx";
import OtrosJugadores from "./OtrosJugadores.jsx";
import RankingTop3 from "./RankingTop3.jsx";
import RankingDetallado from "./RankingDetallado.jsx";
import Configuracion from "./Configuracion.jsx";
import Pistas from "./Pistas.jsx";
import BotonPista from "./BotonPista.jsx";
import ResumenRonda from "./ResumenRonda.jsx";

const jugadores = [
  {
    id: "yo",
    nombre: "Vos",
    avatar: null,
    resultados: [["ausente", "presente", "ausente", "correcto", "ausente"]],
    gano: false,
    finalizado: false,
  },
  {
    id: "u2",
    nombre: "Beto",
    avatar: null,
    resultados: [
      ["ausente", "ausente", "ausente", "ausente", "ausente"],
      ["presente", "correcto", "ausente", "ausente", "presente"],
      ["correcto", "correcto", "correcto", "correcto", "correcto"],
    ],
    gano: true,
    finalizado: true,
  },
  {
    id: "u3",
    nombre: "Carla",
    avatar: null,
    resultados: [["ausente", "ausente", "presente", "ausente", "ausente"]],
    gano: false,
    finalizado: false,
  },
];

const ranking = [
  { id: "u2", nombre: "Beto", avatar: null, puntos: 340, victorias: 4, rondasJugadas: 5, mejorRonda: 163 },
  { id: "u3", nombre: "Carla", avatar: null, puntos: 210, victorias: 2, rondasJugadas: 5, mejorRonda: 120 },
  { id: "yo", nombre: "Vos", avatar: null, puntos: 150, victorias: 1, rondasJugadas: 4, mejorRonda: 92 },
  { id: "u4", nombre: "Diego", avatar: null, puntos: 90, victorias: 0, rondasJugadas: 3, mejorRonda: 40 },
];

const propio = {
  intentos: [{ palabra: "PERRO", resultado: ["ausente", "presente", "ausente", "correcto", "ausente"] }],
  gano: false,
  finalizado: false,
  restantes: 7,
  pistasUsadas: 1,
  pistasDisponibles: 2,
  pistas: [{ posicion: 2, letra: "R" }],
};

export default function Preview() {
  const [tema, setTema] = useState("oscuro");
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.tema = tema;
  }

  return (
    <div className="app">
      {configuracionAbierta && (
        <Configuracion tema={tema} onCambiarTema={setTema} onCerrar={() => setConfiguracionAbierta(false)} />
      )}
      {rankingAbierto && <RankingDetallado ranking={ranking} onCerrar={() => setRankingAbierto(false)} />}

      <header className="encabezado">
        <h1 className="titulo">WordEs</h1>
        <button className="boton-icono" onClick={() => setConfiguracionAbierta(true)} aria-label="Configuración">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <div className="diseño">
        <aside className="columna columna-izquierda">
          <OtrosJugadores jugadores={jugadores} propioId="yo" maxIntentos={8} />
        </aside>

        <main className="columna columna-centro">
          <Tablero propio={propio} maxIntentos={8} intentoActual="CA" filaConError={false} />
          <Pistas pistas={propio.pistas} />
          <BotonPista pistasUsadas={propio.pistasUsadas} pistasDisponibles={propio.pistasDisponibles} onPedir={() => {}} />
          <Teclado partida={propio} onLetra={() => {}} onBorrar={() => {}} onEnter={() => {}} />
          <button className="boton-secundario" style={{ marginTop: 16 }} onClick={() => setMostrarResumen((v) => !v)}>
            (debug) toggle resumen de ronda
          </button>
          {mostrarResumen && (
            <ResumenRonda
              gano
              desglose={{
                verdes: 8,
                amarillos: 3,
                puntosVerdes: 80,
                puntosAmarillos: 12,
                bonusVictoria: 50,
                bonusIntentos: 48,
                pistasUsadas: 1,
                costoPistas: 15,
                total: 175,
              }}
            />
          )}
        </main>

        <aside className="columna columna-derecha">
          <RankingTop3 ranking={ranking} onVerDetalle={() => setRankingAbierto(true)} />
        </aside>
      </div>
    </div>
  );
}
