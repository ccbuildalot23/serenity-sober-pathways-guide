/**
 * Calming Backgrounds Component
 * Provides animated gradients, particle effects, and nature-inspired patterns
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CalmingBackgroundsProps {
  variant?: 'gradient' | 'particles' | 'waves' | 'nature' | 'minimal';
  intensity?: 'subtle' | 'moderate' | 'vivid';
  enabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
}

export const CalmingBackgrounds: React.FC<CalmingBackgroundsProps> = ({
  variant = 'gradient',
  intensity = 'subtle',
  enabled = true,
  className = '',
  children
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Performance optimization: reduce effects if user prefers reduced motion
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const intensityConfig = {
    subtle: {
      particleCount: 20,
      animationSpeed: 0.3,
      opacity: 0.1,
      size: { min: 1, max: 3 }
    },
    moderate: {
      particleCount: 40,
      animationSpeed: 0.5,
      opacity: 0.2,
      size: { min: 2, max: 5 }
    },
    vivid: {
      particleCount: 60,
      animationSpeed: 0.8,
      opacity: 0.3,
      size: { min: 3, max: 8 }
    }
  };

  const config = intensityConfig[intensity];

  // Initialize particles
  const initializeParticles = (canvas: HTMLCanvasElement) => {
    const particles: Particle[] = [];
    const colors = [
      'rgba(99, 102, 241, 0.3)',  // Indigo
      'rgba(139, 69, 19, 0.2)',  // Brown (earth)
      'rgba(34, 139, 34, 0.2)',  // Forest green
      'rgba(70, 130, 180, 0.2)', // Steel blue
      'rgba(218, 165, 32, 0.2)'  // Golden rod
    ];

    for (let i = 0; i < config.particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * config.animationSpeed,
        vy: (Math.random() - 0.5) * config.animationSpeed,
        size: Math.random() * (config.size.max - config.size.min) + config.size.min,
        opacity: Math.random() * config.opacity,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random()
      });
    }

    particlesRef.current = particles;
  };

  // Animate particles
  const animateParticles = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      // Update life for breathing effect
      particle.life += 0.01;
      const breathe = Math.sin(particle.life) * 0.5 + 0.5;
      
      // Draw particle
      ctx.globalAlpha = particle.opacity * breathe;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * breathe, 0, Math.PI * 2);
      ctx.fill();
    });

    if (isVisible && enabled && !prefersReducedMotion) {
      animationFrameRef.current = requestAnimationFrame(() => 
        animateParticles(canvas, ctx)
      );
    }
  };

  // Draw wave pattern
  const drawWaves = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, time: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const amplitude = 20;
    const frequency = 0.01;
    const speed = 0.002;
    
    ctx.strokeStyle = `rgba(99, 102, 241, ${config.opacity})`;
    ctx.lineWidth = 2;
    
    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x++) {
        const y = canvas.height / 2 + 
                  amplitude * Math.sin(frequency * x + speed * time + wave * Math.PI / 3) +
                  wave * 40 - 40;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  };

  // Setup canvas and animation
  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (variant === 'particles') {
      initializeParticles(canvas);
      animateParticles(canvas, ctx);
    } else if (variant === 'waves') {
      const startTime = Date.now();
      const animateWaves = () => {
        const time = Date.now() - startTime;
        drawWaves(canvas, ctx, time);
        if (isVisible && enabled) {
          animationFrameRef.current = requestAnimationFrame(animateWaves);
        }
      };
      animateWaves();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [variant, intensity, enabled, isVisible, prefersReducedMotion]);

  // Pause animation when component is not visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    const element = canvasRef.current?.parentElement;
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const gradientClasses = {
    gradient: {
      subtle: 'bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30',
      moderate: 'bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-purple-100/40',
      vivid: 'bg-gradient-to-br from-blue-200/50 via-indigo-200/40 to-purple-200/50'
    },
    nature: {
      subtle: 'bg-gradient-to-br from-green-50/30 via-emerald-50/20 to-teal-50/30',
      moderate: 'bg-gradient-to-br from-green-100/40 via-emerald-100/30 to-teal-100/40',
      vivid: 'bg-gradient-to-br from-green-200/50 via-emerald-200/40 to-teal-200/50'
    },
    minimal: {
      subtle: 'bg-gradient-to-br from-gray-50/20 via-slate-50/10 to-zinc-50/20',
      moderate: 'bg-gradient-to-br from-gray-100/30 via-slate-100/20 to-zinc-100/30',
      vivid: 'bg-gradient-to-br from-gray-200/40 via-slate-200/30 to-zinc-200/40'
    }
  };

  const backgroundClass = gradientClasses[variant as keyof typeof gradientClasses]?.[intensity] || 
                          gradientClasses.gradient[intensity];

  return (
    <div className={cn('relative overflow-hidden', backgroundClass, className)}>
      {/* Canvas for particle/wave effects */}
      {(variant === 'particles' || variant === 'waves') && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}

      {/* CSS-based animated background patterns */}
      {variant === 'gradient' && !prefersReducedMotion && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 60% 40%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)
            `,
            animation: 'breathe 8s ease-in-out infinite'
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.5;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// Pre-configured variants for common use cases
export const NatureBackground: React.FC<Omit<CalmingBackgroundsProps, 'variant'>> = (props) => (
  <CalmingBackgrounds {...props} variant="nature" />
);

export const ParticleBackground: React.FC<Omit<CalmingBackgroundsProps, 'variant'>> = (props) => (
  <CalmingBackgrounds {...props} variant="particles" />
);

export const WaveBackground: React.FC<Omit<CalmingBackgroundsProps, 'variant'>> = (props) => (
  <CalmingBackgrounds {...props} variant="waves" />
);

export const MinimalBackground: React.FC<Omit<CalmingBackgroundsProps, 'variant'>> = (props) => (
  <CalmingBackgrounds {...props} variant="minimal" />
);

export default CalmingBackgrounds;