import { useEffect, useRef } from 'react';
import { PianoStyle, PIANO_NOTES } from '../types';

interface VisualizerProps {
  activeNotes: Set<string>;
  style: PianoStyle;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function Visualizer({ activeNotes, style }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Get active color profile based on style
  const getStyleColors = (styleType: PianoStyle) => {
    switch (styleType) {
      case 'grand':
        return {
          bg: '#1e1b18', // deep warm charcoal
          accent: 'rgba(217, 119, 6, 0.45)', // gold amber
          particleColors: ['#f59e0b', '#d97706', '#b45309', '#fef3c7']
        };
      case 'electric':
        return {
          bg: '#0f172a', // deep cyan-slate
          accent: 'rgba(6, 182, 212, 0.45)', // cyan
          particleColors: ['#06b6d4', '#0891b2', '#0e7490', '#cffafe']
        };
      case 'synthwave':
        return {
          bg: '#180018', // cyber dark purple
          accent: 'rgba(236, 72, 153, 0.5)', // neon pink
          particleColors: ['#ec4899', '#f43f5e', '#a21caf', '#fce7f3']
        };
      case 'chiptune':
        return {
          bg: '#022c22', // retro dark green
          accent: 'rgba(16, 185, 129, 0.5)', // matrix emerald
          particleColors: ['#10b981', '#059669', '#047857', '#ecfdf5']
        };
      case 'organ':
        return {
          bg: '#1e112c', // gothic dark purple
          accent: 'rgba(168, 85, 247, 0.45)', // purple
          particleColors: ['#a855f7', '#9333ea', '#7e22ce', '#f3e8ff']
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    // Set initial size
    resizeCanvas();

    // Setup resize listener
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Audio animation loop
    let lastTime = performance.now();

    const draw = (timestamp: number) => {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      const colors = getStyleColors(style);

      // 1. Draw Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Style-specific visual patterns (like synthwave grids or retro bars)
      if (style === 'synthwave') {
        // Neon horizon grid
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.08)';
        ctx.lineWidth = 1;
        // Horizontal lines warping down
        for (let y = 0; y < height; y += 12) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        // Perspective vertical lines
        const center = width / 2;
        for (let offset = -width; offset <= width; offset += 50) {
          ctx.beginPath();
          ctx.moveTo(center + offset * 0.1, 0);
          ctx.lineTo(center + offset, height);
          ctx.stroke();
        }
      } else if (style === 'chiptune') {
        // Matrix retro binary rain digital feel
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // 3. Render active notes columns / glowing beams
      const numKeys = PIANO_NOTES.length;
      const keyWidth = width / numKeys;

      PIANO_NOTES.forEach((noteConfig, index) => {
        const isNoteActive = activeNotes.has(noteConfig.note);
        const xPos = index * keyWidth + keyWidth / 2;

        if (isNoteActive) {
          // Draw subtle columns behind active keys
          const gradient = ctx.createLinearGradient(xPos - keyWidth / 2, height, xPos + keyWidth / 2, 0);
          gradient.addColorStop(0, colors.accent);
          gradient.addColorStop(0.6, colors.accent.replace('0.45', '0.15').replace('0.5', '0.15'));
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = gradient;
          ctx.fillRect(index * keyWidth, 0, keyWidth, height);

          // Emit particles from active keys
          if (Math.random() < 0.4) {
            const particleColor = colors.particleColors[Math.floor(Math.random() * colors.particleColors.length)];
            particlesRef.current.push({
              x: index * keyWidth + Math.random() * keyWidth,
              y: height - 10,
              vx: (Math.random() - 0.5) * 40,
              vy: -50 - Math.random() * 120,
              radius: 2 + Math.random() * 5,
              color: particleColor,
              alpha: 1,
              decay: 0.4 + Math.random() * 0.8
            });
          }
        }
      });

      // 4. Update and Draw Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;

        if (p.alpha <= 0 || p.y < 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = style === 'synthwave' || style === 'electric' ? 8 : 0;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // 5. Draw decorative visual waveforms (oscilloscope) at the center
      if (activeNotes.size > 0) {
        ctx.beginPath();
        ctx.strokeStyle = colors.accent.replace('0.45', '0.7').replace('0.5', '0.7');
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.particleColors[0];

        const points = 60;
        const sliceWidth = width / points;
        let x = 0;

        for (let i = 0; i <= points; i++) {
          // Compute a neat composite sine wave based on active notes
          let displacement = 0;
          let notesCount = 0;

          activeNotes.forEach((noteName) => {
            const noteIdx = PIANO_NOTES.findIndex((n) => n.note === noteName);
            const freqFactor = (noteIdx + 1) * 0.15;
            displacement += Math.sin(timestamp * 0.01 + i * freqFactor) * 20;
            notesCount++;
          });

          const averageDisplacement = notesCount > 0 ? displacement / Math.sqrt(notesCount) : 0;
          const y = height / 2.5 + averageDisplacement;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else {
        // Draw calm flatline line with slight noise
        ctx.beginPath();
        ctx.strokeStyle = colors.accent.replace('0.45', '0.18').replace('0.5', '0.18');
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, height / 2.5);
        ctx.lineTo(width, height / 2.5);
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    animationFrameId.current = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [activeNotes, style]);

  return (
    <div className="relative w-full h-36 md:h-44 rounded-t-2xl overflow-hidden shadow-inner border border-slate-800">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Overlay Title / Keyboard Indicators */}
      <div className="absolute top-3 left-4 flex items-center gap-2 pointer-events-none select-none">
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            activeNotes.size > 0 ? 'bg-indigo-500' : 'bg-emerald-500'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            activeNotes.size > 0 ? 'bg-indigo-500' : 'bg-emerald-500'
          }`}></span>
        </span>
        <span className="font-mono text-[10px] tracking-wider text-slate-400 font-bold uppercase">
          {activeNotes.size > 0 ? `${activeNotes.size} voice(s) active` : 'Awaiting Note Input'}
        </span>
      </div>

      <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 pointer-events-none">
        <span className="text-[10px] font-mono text-slate-300 font-medium">AUDIO OSCILLOSCOPE</span>
      </div>
    </div>
  );
}
