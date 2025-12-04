import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  speedMultiplier?: number; // 1 = Normal, 0.5 = Slow, 2 = Fast
  breathDuration?: string; // e.g. "4s", "8s"
  forceAnimate?: boolean; // Forces animation even if inactive (for welcome screen)
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, speedMultiplier = 1, breathDuration = '4s', forceAnimate = false }) => {
  // References for the rotating elements
  const ringRef = useRef<HTMLDivElement>(null);
  const geoRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const outerPulseRef = useRef<HTMLDivElement>(null); 
  
  // Animation object references
  const animRing = useRef<Animation | null>(null);
  const animGeo = useRef<Animation | null>(null);
  const animOrbit = useRef<Animation | null>(null);
  const animOuterPulse = useRef<Animation | null>(null);

  // Physics State for Inertia
  const currentSpeedRef = useRef(0.05); // Start at idle speed
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Constants
  const BASE_DURATION = 20000; // 20 seconds for a full rotation at normal speed
  const BASE_PULSE_DURATION = 8000; 

  // Initialize Animations Once
  useEffect(() => {
    // Rotation Animations
    if (ringRef.current && !animRing.current) {
        animRing.current = ringRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }
    if (geoRef.current && !animGeo.current) {
        animGeo.current = geoRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], 
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }
    if (orbitRef.current && !animOrbit.current) {
        animOrbit.current = orbitRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }
    
    // Pulse Animation - Controlled via Web Animations API for sync
    if (outerPulseRef.current && !animOuterPulse.current) {
        animOuterPulse.current = outerPulseRef.current.animate(
            [
                { transform: 'scale(1)', opacity: 0.2 },
                { transform: 'scale(1.15)', opacity: 0.5 }, 
                { transform: 'scale(1)', opacity: 0.2 }
            ],
            { duration: BASE_PULSE_DURATION, iterations: Infinity, easing: 'ease-in-out' }
        );
    }
    
    // Set initial playback rates
    const initialRate = 0.05;
    [animRing.current, animGeo.current, animOrbit.current, animOuterPulse.current].forEach(anim => {
        if (anim) anim.playbackRate = initialRate;
    });

    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // Run once on mount

  // Watch for Mode Change (Welcome -> App) to reset physics
  useEffect(() => {
    // If we just entered the app (forceAnimate went false), reset speed to avoid momentum carry-over
    if (!forceAnimate) {
        currentSpeedRef.current = 0.05;
    }
  }, [forceAnimate]);

  // Physics Loop: Smoothly interpolate speed & Handle Tab Switching
  useEffect(() => {
    const shouldAnimate = isActive || forceAnimate;
    const targetSpeed = shouldAnimate ? speedMultiplier : 0.05; 
    
    // Reset lastTime immediately to avoid huge jumps
    lastTimeRef.current = performance.now();

    const animatePhysics = (time: number) => {
        // 1. Calculate Delta Time (dt)
        let dt = time - lastTimeRef.current;
        lastTimeRef.current = time;

        // TAB SWITCH FIX (Aggressive): 
        // If frame took longer than 60ms (dropped frames or tab switch), 
        // treat it as a standard 16ms frame to prevent physics explosions.
        if (dt > 60) dt = 16.66; 

        // 2. Physics: Inertia (Lerp)
        // Smoother friction factor for cleaner transitions
        // High Friction = "Liquid" feel
        const diff = targetSpeed - currentSpeedRef.current;
        const friction = 1 - Math.pow(0.01, dt / 1000); // 0.01 Base = Very smooth/slow friction
        
        if (Math.abs(diff) < 0.001) {
            currentSpeedRef.current = targetSpeed;
        } else {
            currentSpeedRef.current += diff * friction; // Apply friction-based interpolation
        }

        const rate = currentSpeedRef.current;

        // 3. Apply Speed to Rotations
        [animRing.current, animGeo.current, animOrbit.current].forEach(anim => {
            if (anim) anim.playbackRate = rate;
        });

        // 4. Apply Speed to Pulse (Linked to rotation speed for consistency)
        if (animOuterPulse.current) {
             animOuterPulse.current.playbackRate = Math.max(0.2, rate * 0.8);
        }

        rafRef.current = requestAnimationFrame(animatePhysics);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animatePhysics);
    
    // Handle Visibility Change to reset timer explicitly
    const handleVisChange = () => {
        if (document.visibilityState === 'visible') {
            lastTimeRef.current = performance.now();
        }
    };
    document.addEventListener('visibilitychange', handleVisChange);

    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [isActive, speedMultiplier, forceAnimate, breathDuration]);

  // CSS classes
  const transitionClass = 'transition-all duration-[2000ms] ease-out gpu-accelerated';
  const displayActive = isActive || forceAnimate;

  return (
    <div className="relative flex justify-center items-center w-full h-[350px] gpu-accelerated pointer-events-none select-none">
      
      {/* 1. BACKGROUND AURA */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[450px] md:h-[450px] pointer-events-none transition-all duration-[3000ms] ease-out gpu-accelerated ${displayActive ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}
      >
         <div 
            className="absolute inset-0 bg-cyan-900/10 rounded-full blur-[60px]"
         />
         <div 
            className={`absolute inset-[15%] bg-blue-500/5 rounded-full blur-[40px] transition-opacity duration-[3000ms] ${displayActive ? 'opacity-100' : 'opacity-0'}`}
         />
      </div>

      {/* 2. MANDALA CONTAINER */}
      <div className={`relative z-10 flex justify-center items-center w-[200px] h-[200px] ${transitionClass} ${displayActive ? 'scale-105' : 'scale-100'}`}>
          
          <div 
            className={`absolute w-32 h-32 bg-cyan-500/10 rounded-full blur-xl ${transitionClass} ${displayActive ? 'opacity-100' : 'opacity-60'}`}
          ></div>
          
          {/* Inner Ring */}
          <div 
            ref={ringRef}
            className={`absolute w-40 h-40 border rounded-full ${transitionClass} ${displayActive ? 'border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border-slate-700/50'}`} 
          ></div>
          
          {/* Geometry */}
          <div 
              ref={geoRef}
              className={`absolute w-32 h-32 border ${transitionClass} ${displayActive ? 'border-slate-100/30' : 'border-slate-600/30'}`}
          ></div>
          
          {/* Outer Pulse */}
          <div 
              ref={outerPulseRef}
              className={`absolute border rounded-full w-56 h-56 ${transitionClass} ${displayActive ? 'border-cyan-500/20' : 'border-transparent'}`}
          ></div>

          {/* Center */}
          <div className={`absolute w-3 h-3 rounded-full ${transitionClass} ${displayActive ? 'bg-white shadow-[0_0_20px_cyan]' : 'bg-slate-500'}`}></div>
          
          {/* Orbit */}
          <div 
              ref={orbitRef}
              className={`absolute w-full h-full ${transitionClass} ${displayActive ? 'opacity-100' : 'opacity-60'}`}
          >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-200 shadow-[0_0_5px_cyan]"></div>
          </div>
      </div>
    </div>
  );
};