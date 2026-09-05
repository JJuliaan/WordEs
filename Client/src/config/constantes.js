// Constantes de UI/UX que no son reglas del juego (esas las manda el
// servidor en el mensaje "estado": maxIntentos, maxPistas, longitudPalabra).
// Centralizadas acá para que ningún componente tenga su propio numerito suelto.

export const CLAVE_TEMA = "wordes-tema";

export const TECLAS_LETRA = /^[A-ZÑ]$/;

// Sólo se usan como respaldo antes de que llegue el primer "estado" del
// servidor (que siempre trae los valores reales).
export const MAX_INTENTOS_POR_DEFECTO = 8;
export const LONGITUD_PALABRA_POR_DEFECTO = 5;

export const DURACION_NOTIFICACION_MS = 4000;
export const DURACION_ERROR_INTENTO_MS = 2000;

export const FILAS_TECLADO = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
export const PRIORIDAD_TECLA = { ausente: 0, presente: 1, correcto: 2 };

export const CONFETI_COLORES = ["#538d4e", "#b59f3b", "#6aaa64", "#f5793a", "#85c0f9", "#e63946", "#ffd166"];
export const CONFETI_DURACION_MS = 3200;
export const CONFETI_CANTIDAD_PARTICULAS = 160;
