// Avisos flotantes de "fulano acertó la palabra", con su foto de perfil de
// Discord si la tiene. App.jsx los saca solos de la lista después de un rato.
export default function Notificaciones({ notificaciones }) {
  if (notificaciones.length === 0) return null;

  return (
    <div className="notificaciones">
      {notificaciones.map((notificacion) => (
        <div className="notificacion" key={notificacion.id}>
          {notificacion.avatar ? (
            <img className="notificacion-avatar" src={notificacion.avatar} alt="" />
          ) : (
            <div className="notificacion-avatar avatar-vacio" />
          )}
          <span>
            <strong>{notificacion.nombre}</strong> acertó la palabra
          </span>
        </div>
      ))}
    </div>
  );
}
