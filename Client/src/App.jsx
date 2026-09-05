import { useState } from "react";
import Tablero from "./components/Tablero.jsx";
import Teclado from "./components/Teclado.jsx";
import OtrosJugadores from "./components/OtrosJugadores.jsx";
import RankingTop3 from "./components/RankingTop3.jsx";
import RankingDetallado from "./components/RankingDetallado.jsx";
import Notificaciones from "./components/Notificaciones.jsx";
import Confeti from "./components/Confeti.jsx";
import Configuracion from "./components/Configuracion.jsx";
import Pistas from "./components/Pistas.jsx";
import BotonPista from "./components/BotonPista.jsx";
import ResumenRonda from "./components/ResumenRonda.jsx";
import { useTema } from "./hooks/useTema.js";
import { useConexionJuego } from "./hooks/useConexionJuego.js";
import { useIntentoActual } from "./hooks/useIntentoActual.js";
import { useTecladoFisico } from "./hooks/useTecladoFisico.js";
import { useConfetiVictoria } from "./hooks/useConfetiVictoria.js";

export default function App() {
  const [tema, setTema] = useTema();
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);

  const {
    listo,
    error,
    usuario,
    estado,
    errorIntento,
    notificaciones,
    resumenRonda,
    enviarIntento: mandarIntento,
    pedirPista,
    nuevaPartida: mandarNuevaPartida,
  } = useConexionJuego();

  const { intentoActual, agregarLetra, borrarLetra, enviarIntento, limpiar } = useIntentoActual(
    estado,
    mandarIntento
  );

  const confeti = useConfetiVictoria(estado?.propio?.gano);

  useTecladoFisico(listo, { onLetra: agregarLetra, onBorrar: borrarLetra, onEnter: enviarIntento });

  function nuevaPartida() {
    mandarNuevaPartida();
    limpiar();
  }

  if (error) {
    return <div className="pantalla-centrada">{error}</div>;
  }

  if (!listo || !estado) {
    return <div className="pantalla-centrada">Conectando con Discord…</div>;
  }

  return (
    <div className="app">
      <Confeti activo={confeti.activo} onFin={confeti.finalizar} />
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
          <OtrosJugadores
            jugadores={estado.jugadores}
            propioId={usuario?.id}
            maxIntentos={estado.maxIntentos}
            longitudPalabra={estado.longitudPalabra}
          />
        </aside>

        <main className="columna columna-centro">
          {estado.cargando || !estado.propio ? (
            <p className="mensaje-cargando">Buscando una palabra nueva…</p>
          ) : (
            <>
              <Tablero
                propio={estado.propio}
                maxIntentos={estado.maxIntentos}
                longitudPalabra={estado.longitudPalabra}
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
                    pistasDisponibles={estado.propio.pistasDisponibles}
                    costoProximaPista={estado.propio.costoProximaPista}
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
