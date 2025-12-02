import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  speedMultiplier?: number; // 1 = Normal, 0.5 = Slow, 2 = Fast
  breathDuration?: string; // e.g. "4s", "8s"
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, speedMultiplier = 1, breathDuration = '4s' }) => {
  // References for the rotating elements
  const ringRef = useRef<HTMLDivElement>(null);
  const geoRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  
  // Animation object references to control playback rate
  const animRing = useRef<Animation | null>(null);
  const animGeo = useRef<Animation | null>(null);
  const animOrbit = useRef<Animation | null>(null);

  // Constants
  const BASE_DURATION = 20000; // 20 seconds for a full rotation at normal speed

  useEffect(() => {
    // 1. Initialize Animations only once (Persist throughout app life)
    if (ringRef.current && !animRing.current) {
        animRing.current = ringRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }
    if (geoRef.current && !animGeo.current) {
        animGeo.current = geoRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], // Reverse direction
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }
    if (orbitRef.current && !animOrbit.current) {
        animOrbit.current = orbitRef.current.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: BASE_DURATION, iterations: Infinity }
        );
    }

    // 2. Calculate Target Playback Rate
    // Idle = Very slow (0.05x). Active = speedMultiplier (e.g. 1x, 3x).
    const targetRate = isActive ? speedMultiplier : 0.05;

    // 3. Smoothly Update Speed (No Jumps)
    // We update the playbackRate property. This keeps the current angle/rotation 
    // and just changes how fast it moves from that point.
    const updateSpeed = (anim: Animation | null) => {
        if (anim) {
            // Check if supported
            if (anim.updatePlaybackRate) {
                anim.updatePlaybackRate(targetRate);
            } else {
                // Fallback
                anim.playbackRate = targetRate;
            }
        }
    };

    updateSpeed(animRing.current);
    updateSpeed(animGeo.current);
    updateSpeed(animOrbit.current);

  }, [isActive, speedMultiplier]);

  // CSS transition for opacity/scale/color only (Not rotation)
  const transitionClass = 'transition-all duration-[2000ms] ease-out';

  return (
    <div className="relative flex justify-center items-center w-full h-[350px]">
      
      {/* 1. LOCALIZED BACKGROUND AURA - BREATHING */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[450px] md:h-[450px] pointer-events-none transition-all duration-[3000ms] ease-out ${isActive ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}
      >
         {/* Deep Glow - Breathes with Hz */}
         <div 
            className="absolute inset-0 bg-cyan-900/20 rounded-full blur-[60px] animate-pulse"
            style={{ animationDuration: breathDuration }}
         />
         {/* Inner Brightness */}
         <div 
            className={`absolute inset-[15%] bg-blue-500/10 rounded-full blur-[40px] transition-opacity duration-[3000ms] ${isActive ? 'opacity-100' : 'opacity-0'}`}
         />
      </div>

      {/* 2. THE MANDALA CONTAINER */}
      <div className={`relative z-10 flex justify-center items-center w-[200px] h-[200px] ${transitionClass} ${isActive ? 'scale-105' : 'scale-100'}`}>
          
          {/* Core Light - Breathes with Hz */}
          <div 
            className={`absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-xl ${transitionClass} ${isActive ? 'opacity-100 animate-pulse' : 'opacity-60'}`}
            style={{ animationDuration: breathDuration }}
          ></div>
          
          {/* Inner Ring (ROTATING) */}
          <div 
            ref={ringRef}
            className={`absolute w-40 h-40 border rounded-full ${transitionClass} ${isActive ? 'border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-700/50'}`} 
          ></div>
          
          {/* Geometry (ROTATING REVERSE) */}
          <div 
              ref={geoRef}
              className={`absolute w-32 h-32 border ${transitionClass} ${isActive ? 'border-slate-100/40' : 'border-slate-600/30'}`}
          ></div>
          
          {/* Outer Ring pulsing (Non-rotating) */}
          <div 
              className={`absolute border rounded-full w-56 h-56 ${transitionClass} ${isActive ? 'border-cyan-500/20' : 'border-transparent'}`}
              style={{ animation: isActive ? `breathe ${breathDuration} ease-in-out infinite` : 'none' }}
          ></div>

          {/* Center Source */}
          <div className={`absolute w-3 h-3 rounded-full ${transitionClass} ${isActive ? 'bg-white shadow-[0_0_20px_cyan]' : 'bg-slate-500'}`}></div>
          
          {/* Orbiting Particles (ROTATING) */}
          <div 
              ref={orbitRef}
              className={`absolute w-full h-full ${transitionClass} ${isActive ? 'opacity-100' : 'opacity-60'}`}
          >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-200 shadow-[0_0_5px_cyan]"></div>
          </div>
      </div>
    </div>
  );
};
