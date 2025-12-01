import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  speedMultiplier?: number; // 1 = Normal, 0.5 = Slow, 2 = Fast
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, speedMultiplier = 1 }) => {
  // Base speeds
  const baseSpeed = 20; // seconds per rotation for normal speed
  const idleSpeed = '60s'; // seconds per rotation for idle

  // Calculate dynamic duration based on state
  // If active, use the calculated speed. If idle, use slow speed.
  const currentSpinDuration = isActive ? `${baseSpeed / speedMultiplier}s` : idleSpeed;
  
  // Transition duration for scale/color (removed opacity transition logic for container)
  const transitionClass = 'transition-all duration-[2000ms] ease-out';

  return (
    <div className="relative flex justify-center items-center w-full h-[350px]">
      
      {/* 1. LOCALIZED BACKGROUND AURA (Kept as requested) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[450px] md:h-[450px] pointer-events-none transition-all duration-[3000ms] ease-out ${isActive ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}>
         {/* Deep Glow - Pulses with the frequency */}
         <div 
            className="absolute inset-0 bg-cyan-900/20 rounded-full blur-[60px] animate-pulse"
            style={{ animationDuration: '4s' }}
         />
         {/* Inner Brightness */}
         <div 
            className={`absolute inset-[15%] bg-blue-500/10 rounded-full blur-[40px] transition-opacity duration-[3000ms] ${isActive ? 'opacity-100' : 'opacity-0'}`}
         />
      </div>

      {/* 2. THE MANDALA CONTAINER - REVERTED TO SINGLE LAYER */}
      {/* FIXED: Removed opacity condition. It is always fully visible (opacity-100), just slower when idle. */}
      <div className={`relative z-10 flex justify-center items-center w-[200px] h-[200px] ${transitionClass} ${isActive ? 'scale-105' : 'scale-100'}`}>
          
          {/* Core Light - Always visible, just pulses when active */}
          <div className={`absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-xl ${transitionClass} ${isActive ? 'opacity-100 animate-pulse' : 'opacity-60'}`}></div>
          
          {/* Inner Ring */}
          <div 
            className={`absolute w-40 h-40 border rounded-full ${transitionClass} ${isActive ? 'border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-700/50'}`} 
            style={{ animation: `spin-slow ${currentSpinDuration} linear infinite` }}
          ></div>
          
          {/* Geometry - Rotating Triangles (Opposite direction) */}
          <div 
              className={`absolute w-32 h-32 border rotate-45 ${transitionClass} ${isActive ? 'border-slate-100/40' : 'border-slate-600/30'}`}
              style={{ animation: `spin-slow ${currentSpinDuration} linear infinite reverse` }}
          ></div>
          
          {/* Outer Ring pulsing */}
          <div 
              className={`absolute border rounded-full w-56 h-56 ${transitionClass} ${isActive ? 'border-cyan-500/20' : 'border-transparent'}`}
              style={{ animation: isActive ? `breathe 2s ease-in-out infinite` : 'none' }}
          ></div>

          {/* Center Source */}
          <div className={`absolute w-3 h-3 rounded-full ${transitionClass} ${isActive ? 'bg-white shadow-[0_0_20px_cyan]' : 'bg-slate-500'}`}></div>
          
          {/* Orbiting Particles */}
          <div 
              className={`absolute w-full h-full ${transitionClass} ${isActive ? 'opacity-100' : 'opacity-60'}`}
              style={{ animation: `spin-slow ${currentSpinDuration} linear infinite` }}
          >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-200 shadow-[0_0_5px_cyan]"></div>
          </div>
      </div>
    </div>
  );
};