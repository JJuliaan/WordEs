import { useEffect, useRef } from "react";

// Confeti casero con canvas (sin librerías externas): un par de puñados de
// rectángulos de colores cayendo con rotación, durante unos segundos.
const COLORES = ["#538d4e", "#b59f3b", "#6aaa64", "#f5793a", "#85c0f9", "#e63946", "#ffd166"];
const DURACION_MS = 3200;
const CANTIDAD_PARTICULAS = 160;

function crearParticulas(ancho, alto) {
  const particulas = [];
  for (let i = 0; i < CANTIDAD_PARTICULAS; i++) {
    particulas.push({
      x: Math.random() * ancho,
      y: -20 - Math.random() * alto * 0.6,
      velocidadY: 2 + Math.random() * 3,
      velocidadX: -1.5 + Math.random() * 3,
      tamano: 6 + Math.random() * 6,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      rotacion: Math.random() * 360,
      velocidadRotacion: -6 + Math.random() * 12,
    });
  }
  return particulas;
}

export default function Confeti({ activo, onFin }) {
  const canvasRef = useRef(null);
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;

  useEffect(() => {
    if (!activo) return;

    const canvas = canvasRef.current;
    const contexto = canvas.getContext("2d");
    const ancho = (canvas.width = window.innerWidth);
    const alto = (canvas.height = window.innerHeight);
    const particulas = crearParticulas(ancho, alto);

    let animacionId;
    const inicio = performance.now();

    function dibujar(ahora) {
      contexto.clearRect(0, 0, ancho, alto);

      for (const particula of particulas) {
        particula.x += particula.velocidadX;
        particula.y += particula.velocidadY;
        particula.rotacion += particula.velocidadRotacion;
        if (particula.y > alto + 20) {
          particula.y = -20;
          particula.x = Math.random() * ancho;
        }

        contexto.save();
        contexto.translate(particula.x, particula.y);
        contexto.rotate((particula.rotacion * Math.PI) / 180);
        contexto.fillStyle = particula.color;
        contexto.fillRect(-particula.tamano / 2, -particula.tamano / 4, particula.tamano, particula.tamano / 2);
        contexto.restore();
      }

      if (ahora - inicio < DURACION_MS) {
        animacionId = requestAnimationFrame(dibujar);
      } else {
        onFinRef.current?.();
      }
    }

    animacionId = requestAnimationFrame(dibujar);
    return () => cancelAnimationFrame(animacionId);
  }, [activo]);

  if (!activo) return null;

  return <canvas ref={canvasRef} className="confeti-canvas" />;
}
