import Modal from "./Modal.jsx";
import Ranking from "./Ranking.jsx";

// El panel "detallado" pedido: se abre encima del juego sin navegar a
// ninguna URL nueva, así que la partida (y el WebSocket) sigue corriendo
// exactamente igual detrás mientras está abierto.
export default function RankingDetallado({ ranking, onCerrar }) {
  return (
    <Modal titulo="Ranking de la sesión" onCerrar={onCerrar}>
      <Ranking ranking={ranking} detallado />
    </Modal>
  );
}
