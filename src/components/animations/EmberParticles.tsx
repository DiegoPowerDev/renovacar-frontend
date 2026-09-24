"use client";

import { useEffect, useRef } from "react";

interface EmberParticlesProps {
  /** Cantidad de partículas en pantalla */
  count?: number;
  /** Color en formato RGB o HEX (ej: "220, 38, 38" o "#dc2626") */
  color?: string;
  /** Dirección hacia donde flotan las partículas */
  direction?: "up" | "down" | "left" | "right";
  /** Rango del tamaño de las partículas [mínimo, máximo] */
  sizeRange?: [number, number];
  /** Rango de velocidad [mínima, máxima] */
  speedRange?: [number, number];
  /** Cantidad de difuminado (Glow / Shadow Blur) */
  blur?: number;
  /** Opacidad máxima de las partículas (0 a 1) */
  maxOpacity?: number;
  /** Oscilación / Deriva horizontal u oscilante */
  driftFactor?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  driftX: number;
  driftPhase: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export default function EmberParticles({
  count = 25,
  color = "#FF4242",
  direction = "down",
  sizeRange = [0.2, 3.5],
  speedRange = [0.2, 1.2],
  blur = 100,
  maxOpacity = 0.5,
  driftFactor = 3,
}: EmberParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convierte HEX a RGB si el usuario pasa color en formato "#RRGGBB"
  const processColor = (rawColor: string) => {
    if (rawColor.startsWith("#")) {
      const hex = rawColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
    return rawColor;
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    const rgbColor = processColor(color);
    const [minSize, maxSize] = sizeRange;
    const [minSpeed, maxSpeed] = speedRange;

    function createParticle(isInitial = false): Particle {
      const maxLife = 6 + Math.random() * 9;
      let x = Math.random() * width;
      let y = Math.random() * height;

      // Si no es la carga inicial, nacen fuera de la pantalla según la dirección
      if (!isInitial) {
        if (direction === "up") y = height + Math.random() * 50;
        if (direction === "down") y = -Math.random() * 50;
        if (direction === "left") x = width + Math.random() * 50;
        if (direction === "right") x = -Math.random() * 50;
      }

      return {
        x,
        y,
        size: minSize + Math.random() * (maxSize - minSize),
        speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
        driftX: (Math.random() - 0.5) * driftFactor,
        driftPhase: Math.random() * Math.PI * 2,
        opacity: 0,
        life: isInitial ? Math.random() * maxLife : 0,
        maxLife,
      };
    }

    const particles: Particle[] = Array.from({ length: count }, () =>
      createParticle(true),
    );

    let animationId: number;

    function animate() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.life += 0.016; // ~60fps

        // Aplicar movimiento según la dirección configurada
        switch (direction) {
          case "up":
            p.y -= p.speed;
            p.x += Math.sin(p.life + p.driftPhase) * p.driftX;
            break;
          case "down":
            p.y += p.speed;
            p.x += Math.sin(p.life + p.driftPhase) * p.driftX;
            break;
          case "left":
            p.x -= p.speed;
            p.y += Math.sin(p.life + p.driftPhase) * p.driftX;
            break;
          case "right":
            p.x += p.speed;
            p.y += Math.sin(p.life + p.driftPhase) * p.driftX;
            break;
        }

        // Fade in al nacer, fade out al morir
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.15) {
          p.opacity = lifeRatio / 0.15;
        } else if (lifeRatio > 0.7) {
          p.opacity = 1 - (lifeRatio - 0.7) / 0.3;
        } else {
          p.opacity = 1;
        }

        p.opacity = Math.max(0, Math.min(1, p.opacity)) * maxOpacity;

        // Dibujar partícula
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${rgbColor}, ${p.opacity})`;

        if (blur > 0) {
          ctx!.shadowBlur = blur;
          ctx!.shadowColor = `rgba(${rgbColor}, ${p.opacity})`;
        }

        ctx!.fill();

        // Evaluar si salió de los bordes para reiniciar
        const isOutOfBounds =
          p.y < -50 || p.y > height + 50 || p.x < -50 || p.x > width + 50;

        if (p.life >= p.maxLife || isOutOfBounds) {
          Object.assign(p, createParticle(false));
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [
    count,
    color,
    direction,
    sizeRange,
    speedRange,
    blur,
    maxOpacity,
    driftFactor,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20"
      aria-hidden="true"
    />
  );
}
