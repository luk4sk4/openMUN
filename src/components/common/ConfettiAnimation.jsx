import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const CONFETTI_COLORS = [
  '#a4d4b3', // OpenMUN success dark
  '#245e39', // OpenMUN success light
  '#efa37f', // OpenMUN terracotta accent
  '#b45432', // OpenMUN primary terracotta
  '#cbb58d', // OpenMUN warm gold
  '#a6b8c9', // OpenMUN info slate
  '#f7f2eb'  // OpenMUN warm ivory
];

/**
 * Mount to play a celebratory confetti burst once; calls onComplete when done.
 */
export default function ConfettiAnimation({ onComplete, duration = 2800 }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => onCompleteRef.current?.(), 50);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onCompleteRef.current?.();
      return undefined;
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 110;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const originX = fromLeft ? width * (0.2 + Math.random() * 0.25) : width * (0.55 + Math.random() * 0.25);
      const originY = height * (0.15 + Math.random() * 0.2);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
      const speed = 7 + Math.random() * 11;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed + (fromLeft ? 1.5 : -1.5),
        vy: Math.sin(angle) * speed - Math.random() * 3,
        w: 7 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.22,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.06 + Math.random() * 0.08,
        gravity: 0.22 + Math.random() * 0.1,
        drag: 0.985,
        shape: i % 5 === 0 ? 'circle' : 'rect'
      };
    });

    const startTime = performance.now();
    let rafId = null;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      ctx.clearRect(0, 0, width, height);

      const alpha = progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.28) : 1;

      particles.forEach((p) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.9;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, Math.cos(p.wobble));
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });

      if (elapsed < duration) {
        rafId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onCompleteRef.current?.();
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [duration]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />,
    document.body
  );
}
