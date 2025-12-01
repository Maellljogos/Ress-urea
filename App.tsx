import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Volume1,
  Square, 
  Fingerprint, 
  X, 
  Activity, 
  ArrowRight, 
  LogOut, 
  Search, 
  Heart, 
  Play, 
  Pause, 
  ShieldCheck, 
  Infinity, 
  HelpCircle,
  Network,
  WifiOff,
  Database,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCcw,
  Loader2,
  Atom,
  Power,
  Info
} from 'lucide-react';
import { PRESET_FREQUENCIES, CATEGORIES, GUARDIAN_FREQUENCY, REACTOR_FREQUENCY } from './constants';
import { Frequency, FrequencyCategory } from './types';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { generateFrequenciesFromIntent } from './services/geminiService';

// Tiny 1x1 black video loop base64. Playing this forces mobile OS to keep screen ON.
const WAKE_LOCK_VIDEO = "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXQAAAKABaaAgAABAAEAAAB5gAAAAAAAAAAAAAAODW1vb3YAAABsbXZoAAAAAMNs6kHDbOpBAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAABBpb2RzAAAAABQAAAABgAAAAQAAAAAAAAAAAAAAAQAAABJ0cmFrAAAAXHRraGQAAAAdw2zqQcNs6kEAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkbWRpYQAAACBtZGhkAAAAAMNs6kHDbOpBAAAAAQAAAAEAAAAAAAARaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAAAAAAB2bWluaGQAAAAAHZtZGhkAAAAAMNs6kHDbOpBAAAAAQAAAAEAAAAAAAARaGRscgAAAAAAAAAAZGluZgAAABRkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEcdHN0YgAAAFhzdHNkAAAAAAAAAAEAAABcaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAEAAQABAAAAAAEgAAACAAFIcHNhbmZwAAAAAAAAAAAAAAQAAQAAAB9ocGRjAAAAAAAAAAAAAAFAAAAAAQAAAAEAABkAAAB4c3R0cwAAAAAAAAABAAAAAQAAAAEAAAAUc3RzeHAAAAABAAAAAQAAAAEAAAAQc3RzYwAAAAAAAAABAAAAAQAAAAEAAAAcc3RzegAAAAAAAAAAAAAAAQAAAAEAAAAUc3RjbwAAAAAAAAABAAAAAAAAYXVkdGEAAAA1bWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcgAAAAAAAAAAAAAAAAAAAAAIL2lsb3QAAAAA";

const App: React.FC = () => {
  const [activeFrequencies, setActiveFrequencies] = useState<string[]>([]);
  const [isScalarMode, setIsScalarMode] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'INTENT' | 'MATRIX'>('INTENT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFrequencies, setGeneratedFrequencies] = useState<Frequency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hasStarted, setHasStarted] = useState(false);
  const [guardianActive, setGuardianActive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isAudible, setIsAudible] = useState(false); // Default is subliminal
  
  // Feedback state
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  // Guardian Toggle State
  const [guardianEnabledByUser, setGuardianEnabledByUser] = useState(true);

  // Personal Calibration State
  const [showCalibration, setShowCalibration] = useState(false);
  const [personalFrequency, setPersonalFrequency] = useState<Frequency | null>(null);
  const [recommendedFrequencies, setRecommendedFrequencies] = useState<Frequency[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const scanInterval = useRef<any>(null);
  
  const [scanReadings, setScanReadings] = useState<number[]>([]);
  const MAX_SCANS = 3;
  
  // Modals
  const [showSigns, setShowSigns] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showScalarHelp, setShowScalarHelp] = useState(false);
  const [showReactorHelp, setShowReactorHelp] = useState(false);

  // Refs
  const listTopRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null); // Hack for screen keep awake

  useEffect(() => {
    const savedFavs = localStorage.getItem('quantum_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
    
    const savedPersonal = localStorage.getItem('quantum_personal_freq');
    if (savedPersonal) {
      setPersonalFrequency(JSON.parse(savedPersonal));
      setCalibrationStep('idle'); 
    }

    audioEngine.setCallback((enginePlaying) => {
      setIsPlaying(enginePlaying);
    });

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine if Reactor is Active for UI Effects
  const isReactorActive = activeFrequencies.includes(REACTOR_FREQUENCY.id);

  // Wake Lock Logic (Video Hack)
  useEffect(() => {
    // When Reactor state changes, handle video playback to ensure screen stays on
    if (isReactorActive) {
        if (videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("WakeLock video init deferred (user interaction needed).");
                });
            }
        }
        
        // Try WakeLock API as backup
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen')
                .then((lock: any) => { wakeLockRef.current = lock; })
                .catch((e: any) => console.log('WakeLock API failed', e));
        }
    } else {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }
    }
  }, [isReactorActive]);

  useEffect(() => {
    if (lastGeneratedId) {
      setTimeout(() => {
        const element = document.getElementById(lastGeneratedId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      setShowSuccessMsg(true);
      const timer = setTimeout(() => setShowSuccessMsg(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastGeneratedId]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setLastGeneratedId(null); 
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let newFavs;
    if (favorites.includes(id)) {
      newFavs = favorites.filter(favId => favId !== id);
    } else {
      newFavs = [...favorites, id];
    }
    setFavorites(newFavs);
    localStorage.setItem('quantum_favorites', JSON.stringify(newFavs));
  };

  const allFrequencies = [
    ...(personalFrequency ? [personalFrequency] : []),
    ...generatedFrequencies, 
    ...PRESET_FREQUENCIES
  ];

  const filteredFrequencies = selectedCategory === 'All' 
    ? allFrequencies 
    : selectedCategory === 'FAVORITOS'
      ? allFrequencies.filter(f => favorites.includes(f.id))
      : allFrequencies.filter(f => f.category === selectedCategory);

  // Guardian Logic
  useEffect(() => {
    if (!hasStarted) return;

    const hasFocusFrequencies = activeFrequencies.some(id => {
      const freq = allFrequencies.find(f => f.id === id);
      // Also pause guardian if Reactor is active
      const isReactor = id === REACTOR_FREQUENCY.id;
      return isReactor || (freq && (
          freq.category === FrequencyCategory.PERFORMANCE || 
          freq.category === FrequencyCategory.MIND ||
          freq.category === FrequencyCategory.HYPER_MATRIX ||
          freq.category === FrequencyCategory.SCALAR
      ));
    });

    const hasCustomActive = activeFrequencies.some(id => id.startsWith('custom_') || id.startsWith('offline_'));
    const shouldPauseGuardian = hasFocusFrequencies || hasCustomActive;

    if (guardianEnabledByUser && !shouldPauseGuardian && isPlaying) {
      if (!guardianActive) {
        audioEngine.playFrequency(GUARDIAN_FREQUENCY.id, GUARDIAN_FREQUENCY.hz);
        setGuardianActive(true);
      }
    } else {
      if (guardianActive) {
        audioEngine.stopFrequency(GUARDIAN_FREQUENCY.id);
        setGuardianActive(false);
      }
    }
  }, [activeFrequencies, guardianEnabledByUser, isPlaying, hasStarted, allFrequencies, guardianActive]);


  const handleStart = () => {
    audioEngine.init();
    audioEngine.enableBackgroundMode();
    setHasStarted(true);
  };

  const handleBackToStart = () => {
    setHasStarted(false);
  };

  const togglePlayPauseGlobal = () => {
    if (isPlaying) {
      audioEngine.pauseGlobal();
    } else {
      audioEngine.resumeGlobal();
    }
  };

  const toggleAudibleMode = () => {
    const newVal = !isAudible;
    setIsAudible(newVal);
    audioEngine.setSubliminalMode(!newVal); // if audible is true, subliminal is false
  };

  const toggleFrequency = (freq: Frequency) => {
    if (activeFrequencies.includes(freq.id)) {
      audioEngine.stopFrequency(freq.id);
      setActiveFrequencies(prev => prev.filter(id => id !== freq.id));
    } else {
      audioEngine.playFrequency(freq.id, freq.hz);
      setActiveFrequencies(prev => [...prev, freq.id]);
    }
  };

  const toggleScalarMode = () => {
    const newState = !isScalarMode;
    setIsScalarMode(newState);
    audioEngine.enableScalarMode(newState);
  };

  const handleGenerate = async () => {
    if (!searchTerm.trim()) return;

    setIsGenerating(true);
    
    // Determine category based on mode
    const isMatrix = searchMode === 'MATRIX';
    const cat = isMatrix ? FrequencyCategory.HYPER_MATRIX : FrequencyCategory.CUSTOM;

    const newFrequencies = await generateFrequenciesFromIntent(searchTerm, cat);
    
    setGeneratedFrequencies(prev => [...newFrequencies, ...prev]);
    setIsGenerating(false);
    
    setSearchTerm('');

    if (newFrequencies.length > 0) {
        if (!isMatrix) setSelectedCategory('All'); 
        else setSelectedCategory(FrequencyCategory.HYPER_MATRIX);

        setLastGeneratedId(newFrequencies[0].id);
    }
  };

  // Biometrics
  const startBiometricScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setCalibrationStep('scanning');
    setScanProgress(0);

    let progress = 0;
    scanInterval.current = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      
      if (progress >= 100) {
        clearInterval(scanInterval.current);
        finishSingleScan();
      }
    }, 40);
  };

  const finishSingleScan = () => {
    setIsScanning(false);
    const reading = Math.floor(Math.random() * 580) + 20;
    const newReadings = [...scanReadings, reading];
    setScanReadings(newReadings);

    if (newReadings.length < MAX_SCANS) {
       setScanProgress(0);
       setCalibrationStep('scanning'); 
    } else {
       finalizeCalibration(newReadings);
    }
  };

  const finalizeCalibration = (readings: number[]) => {
      const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
      const finalHz = Number(avg.toFixed(2));

      const identityFreq: Frequency = {
        id: 'personal_identity',
        hz: finalHz,
        name: 'Minha Frequência Base',
        description: 'Sintonia média triangulada do seu campo bio-elétrico atual.',
        category: FrequencyCategory.PERSONAL,
      };

      setPersonalFrequency(identityFreq);
      localStorage.setItem('quantum_personal_freq', JSON.stringify(identityFreq));

      // Reset step to 'idle' so the UI renders the result view (which checks for personalFrequency)
      setCalibrationStep('idle'); 
  };

  const resetCalibration = () => {
      setScanReadings([]);
      setScanProgress(0);
      setCalibrationStep('idle');
      setIsScanning(false);
  };

  const getBiometricAdvice = (hz: number) => {
    if (hz < 150) {
        return {
            title: "Campo Denso Detectado",
            text: "Sua vibração indica acúmulo de tensão ou bloqueios. Recomendamos iniciar com LIMPEZA (Solfeggio 396Hz/741Hz) para purificação.",
            color: "text-rose-400"
        };
    } else if (hz < 450) {
        return {
            title: "Campo Estável",
            text: "Sua energia está equilibrada e receptiva. É o momento ideal para fortalecer o CORPO e alinhar o MENTAL (Alpha/Theta).",
            color: "text-emerald-400"
        };
    } else {
        return {
            title: "Alta Vibração Detectada",
            text: "Seu campo está sutil e expandido. Você está pronto para cocriação acelerada (MATRIX) e frequências de ABUNDÂNCIA.",
            color: "text-cyan-400"
        };
    }
  };

  // Visualizer Speed
  const getActiveHzAverage = () => {
      if (activeFrequencies.length === 0) return 0;
      let total = 0;
      let count = 0;
      activeFrequencies.forEach(id => {
          const f = allFrequencies.find(freq => freq.id === id);
          if (f) {
              total += f.hz;
              count++;
          }
      });
      // Add Reactor if active
      if (activeFrequencies.includes(REACTOR_FREQUENCY.id)) {
          total += REACTOR_FREQUENCY.hz;
          count++;
      }
      if (count === 0) return 0;
      return total / count;
  };

  const avgHz = getActiveHzAverage();
  let speedMult = 0.5;
  if (avgHz > 0) {
      if (avgHz < 10) speedMult = 0.2;
      else if (avgHz < 40) speedMult = 1.0;
      else speedMult = 3.0;
  }

  const getCategoryTheme = (category: FrequencyCategory) => {
    switch (category) {
      case FrequencyCategory.SCALAR:
        return {
          bg: 'from-slate-200 to-white', 
          text: 'text-slate-800',
          tabText: 'text-slate-900', 
          border: 'border-slate-300',
          icon: 'text-slate-600',
          gradient: 'from-slate-100 to-slate-300',
          shadow: 'shadow-[0_0_15px_rgba(203,213,225,0.4)]'
        };
      case FrequencyCategory.HYPER_MATRIX:
        return {
          bg: 'from-emerald-950/40 to-emerald-900/10',
          text: 'text-emerald-100',
          tabText: 'text-white', 
          border: 'border-emerald-500/30',
          icon: 'text-emerald-400',
          gradient: 'from-emerald-600 to-teal-400',
          shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
        };
      case FrequencyCategory.SOLFEGGIO:
      case FrequencyCategory.BODY:
        return {
          bg: 'from-teal-950/40 to-teal-900/10', 
          text: 'text-teal-100',
          tabText: 'text-white',
          border: 'border-teal-500/30',
          icon: 'text-teal-400',
          gradient: 'from-teal-500 to-cyan-400',
          shadow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]'
        };
      case FrequencyCategory.ABUNDANCE:
      case FrequencyCategory.PERFORMANCE:
      case FrequencyCategory.ARCHETYPE:
        return {
          bg: 'from-slate-900 to-yellow-50/10', 
          text: 'text-slate-100',
          tabText: 'text-slate-900',
          border: 'border-slate-200/30', 
          icon: 'text-slate-900', 
          gradient: 'from-slate-200 to-yellow-50', 
          shadow: 'shadow-[0_0_15px_rgba(248,250,252,0.15)]'
        };
      case FrequencyCategory.MIND:
        return {
          bg: 'from-sky-950/40 to-sky-900/10',
          text: 'text-sky-100',
          tabText: 'text-white',
          border: 'border-sky-500/30',
          icon: 'text-sky-400',
          gradient: 'from-sky-500 to-blue-400',
          shadow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]'
        };
      default:
        return {
          bg: 'from-slate-900/50 to-slate-800/20',
          text: 'text-slate-200',
          tabText: 'text-slate-200',
          border: 'border-slate-700/50',
          icon: 'text-slate-400',
          gradient: 'from-slate-500 to-slate-300',
          shadow: ''
        };
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)] animate-pulse" style={{ animationDuration: '8s' }}></div>
        </div>

        {/* WELCOME SCREEN CONTENT - Moved UP with -mt-32 */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full -mt-32">
          <div className="mb-12 scale-125">
             <Visualizer isActive={false} />
          </div>

          <h1 className="text-5xl md:text-6xl font-orbitron font-bold mb-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-100 glow-text-cyan">
            RESSÁUREA
          </h1>
          
          <p className="text-cyan-200/60 text-lg mb-12 font-light tracking-[0.2em] uppercase">
            Sintonia de Alta Frequência
          </p>

          <button
            onClick={handleStart}
            className="group relative px-10 py-5 bg-transparent overflow-hidden rounded-full transition-all duration-500 hover:scale-105"
          >
            <div className="absolute inset-0 border border-cyan-500/30 rounded-full"></div>
            <div className="absolute inset-0 bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
            <div className="relative flex items-center gap-3 text-cyan-100 font-orbitron tracking-widest text-lg">
              <Fingerprint className="w-6 h-6 animate-pulse" />
              <span>ENTRAR EM RESSONÂNCIA</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP LAYOUT ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-cyan-500/30 relative">
      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
       `}</style>
      
      {/* PERSISTENT HIDDEN VIDEO FOR WAKE LOCK */}
      <video 
         ref={videoRef}
         loop 
         muted 
         playsInline 
         className="fixed w-1 h-1 opacity-0 pointer-events-none top-0 left-0"
         src={WAKE_LOCK_VIDEO}
      />

      {/* BACKGROUND VISUALIZER */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center opacity-60">
        <Visualizer isActive={isPlaying && activeFrequencies.length > 0} speedMultiplier={speedMult} />
      </div>

      {/* --- REACTOR MODE OVERLAY (FULL SCREEN) --- */}
      {isReactorActive && (
          <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in-up">
              {/* Strobe Effect Layer */}
              <div className="absolute inset-0 bg-white animate-pulse" style={{ animationDuration: '0.08s', opacity: 0.15 }}></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent"></div>
              
              <div className="relative z-10 flex flex-col items-center scale-150">
                  <Visualizer isActive={true} speedMultiplier={4} />
              </div>

              <div className="absolute bottom-12 left-0 right-0 z-10 text-center animate-pulse flex flex-col items-center">
                  <h2 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-400 to-red-500 mb-2">
                      FUSÃO GAMMA
                  </h2>
                  <p className="text-orange-200/60 text-sm tracking-[0.5em] font-light uppercase mb-8">Sincronizando Hemisférios</p>

                  <button
                      onClick={() => toggleFrequency(REACTOR_FREQUENCY)}
                      className="group flex items-center gap-3 px-8 py-4 rounded-full border border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-200 transition-all"
                  >
                      <Power className="w-6 h-6" />
                      <span className="font-bold tracking-widest">PARAR FUSÃO</span>
                  </button>
              </div>
          </div>
      )}

      {/* FIXED HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-4 justify-between">
         <div className="flex items-center gap-3">
             <button onClick={handleBackToStart} className="p-2 text-slate-400 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
             </button>
             <h1 className="text-xl font-orbitron font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-cyan-200">
               RESSÁUREA
             </h1>
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={() => setGuardianEnabledByUser(!guardianEnabledByUser)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 ${
                guardianEnabledByUser 
                  ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200 shadow-[0_0_10px_cyan]' 
                  : 'bg-slate-900/50 border-slate-700 text-slate-500'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {guardianEnabledByUser ? 'ESCUDO ON' : 'ESCUDO OFF'}
            </button>
            
            <button 
               onClick={() => setShowTrustModal(true)}
               className={`flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold tracking-widest border transition-all ${
                 isOffline 
                  ? 'bg-slate-900/80 border-slate-600 text-slate-400' 
                  : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400'
               }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-500' : 'bg-cyan-400 animate-pulse'}`}></div>
              {isOffline ? 'MODO OFFLINE' : 'MODO ONLINE'}
            </button>
         </div>
      </header>

      {/* FIXED FOOTER PLAYER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 p-4 z-50">
         <div className="max-w-4xl mx-auto flex items-center justify-between">
             
             {/* Audible Test Toggle */}
             <button 
               onClick={toggleAudibleMode}
               className="flex flex-col items-center gap-1 transition-colors hover:text-white group"
             >
                <div className={`p-2 rounded-full transition-all ${isAudible ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                    {isAudible ? <Volume2 className="w-4 h-4" /> : <Volume1 className="w-4 h-4" />}
                </div>
                <span className={`text-[9px] uppercase tracking-wider ${isAudible ? 'Som Ativo' : 'Subliminar'}`}>
                    {isAudible ? 'Som Ativo' : 'Subliminar'}
                </span>
             </button>

             {/* Global Play/Pause */}
             <div className="flex items-center gap-6">
                <button 
                  onClick={() => audioEngine.stopAll()} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all shadow-lg border border-slate-700 hover:border-red-500/30"
                >
                    <Square className="w-4 h-4 fill-current" />
                </button>
                
                <button 
                  onClick={togglePlayPauseGlobal}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center hover:scale-105 transition-all border border-white/20"
                >
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current pl-1" />}
                </button>
             </div>

             {/* Resonance Signs Button */}
             <button 
               onClick={() => setShowSigns(true)}
               className="flex flex-col items-center gap-1 text-slate-500 hover:text-cyan-400 transition-colors"
             >
                <div className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-all">
                   <Activity className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase tracking-wider">Sinais</span>
             </button>
         </div>
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      {/* Padding added (pt-16 for header, pb-32 for footer) so nothing is hidden. */}
      <main className="pt-16 pb-32 animate-fade-in-up">
        
        {/* STICKY SEARCH & CATEGORIES */}
        <div className="sticky top-16 z-40 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5 pt-4 pb-2 shadow-2xl">
           <div className="max-w-4xl mx-auto px-4 space-y-4">
               {/* 1. SCALAR MODE TOGGLE */}
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isScalarMode ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
                          <Infinity className="w-5 h-5" />
                      </div>
                      <div>
                          <div className="text-sm font-bold text-slate-200">Modo Escalar (Zero Point)</div>
                          <div className="text-xs text-slate-500">Cancelamento de Fase Quântica</div>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={() => setShowScalarHelp(true)} className="p-1.5 text-slate-500 hover:text-white bg-slate-800/50 rounded-full"><HelpCircle className="w-4 h-4"/></button>
                      <button 
                          onClick={toggleScalarMode}
                          className={`w-12 h-6 rounded-full transition-colors relative ${isScalarMode ? 'bg-slate-200' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 ${isScalarMode ? 'translate-x-7 bg-slate-900' : 'translate-x-1 bg-slate-400'}`}></div>
                      </button>
                  </div>
              </div>

              {/* 2. UNIFIED SEARCH INPUT */}
              <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r rounded-full blur transition-opacity opacity-0 group-hover:opacity-30 ${searchMode === 'MATRIX' ? 'from-emerald-500 to-green-500' : 'from-cyan-500 to-blue-500'}`}></div>
                  <div className={`relative bg-slate-900/90 border rounded-full flex items-center p-1.5 pr-2 shadow-lg transition-colors ${searchMode === 'MATRIX' ? 'border-emerald-500/30 focus-within:border-emerald-500' : 'border-cyan-500/30 focus-within:border-cyan-500'}`}>
                      {searchMode === 'MATRIX' ? (
                         <Database className="w-5 h-5 text-emerald-500 ml-3 mr-2" />
                      ) : (
                         <Sparkles className="w-5 h-5 text-cyan-500 ml-3 mr-2" />
                      )}
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={searchMode === 'MATRIX' ? "O que deseja baixar? (Ex: Inglês, Karatê...)" : "Qual sua intenção? (Ex: Curar dor...)"}
                        className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />
                      <div className="flex items-center gap-2 mr-2 bg-slate-800/50 rounded-full p-1 border border-slate-700">
                          <button 
                             onClick={() => setSearchMode('INTENT')}
                             className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${searchMode === 'INTENT' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                              INTENÇÃO
                          </button>
                          <button 
                             onClick={() => setSearchMode('MATRIX')}
                             className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${searchMode === 'MATRIX' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                              MATRIX
                          </button>
                      </div>
                      <button 
                        onClick={() => handleGenerate()}
                        disabled={!searchTerm.trim() || isGenerating}
                        className={`w-10 h-10 flex items-center justify-center rounded-full text-white transition-all disabled:opacity-50 ${searchMode === 'MATRIX' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                      >
                         {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      </button>
                  </div>
              </div>

              {/* 3. CATEGORY TABS */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                  <button
                      onClick={() => handleCategoryChange('All')}
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold tracking-wider transition-all border ${
                          selectedCategory === 'All' 
                          ? 'bg-slate-100 text-slate-900 border-slate-100 shadow-[0_0_10px_white]' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                      TODOS
                  </button>
                  <button
                      onClick={() => handleCategoryChange('FAVORITOS')}
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold tracking-wider transition-all border flex items-center gap-2 ${
                          selectedCategory === 'FAVORITOS' 
                          ? 'bg-rose-900/30 text-rose-200 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                      <Heart className="w-3 h-3 fill-current" /> FAVORITOS
                  </button>

                  {CATEGORIES.map(cat => {
                      const theme = getCategoryTheme(cat);
                      const isSelected = selectedCategory === cat;
                      const textColor = isSelected 
                         ? (cat === FrequencyCategory.ABUNDANCE || cat === FrequencyCategory.PERFORMANCE || cat === FrequencyCategory.ARCHETYPE || cat === FrequencyCategory.SCALAR ? 'text-slate-900' : 'text-white')
                         : 'text-slate-400';

                      return (
                          <button
                              key={cat}
                              onClick={() => handleCategoryChange(cat)}
                              className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold tracking-wider transition-all border ${
                                  isSelected 
                                  ? `bg-gradient-to-r ${theme.gradient} ${textColor} border-transparent shadow-lg` 
                                  : `bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500`
                              }`}
                          >
                              {cat}
                          </button>
                      )
                  })}
              </div>
           </div>
        </div>

        {/* MAIN FREQUENCY GRID */}
        <div className="max-w-4xl mx-auto px-4 pt-6 min-h-[100vh]" ref={listTopRef}>
          
          {/* Biometrics Recalibration Button */}
          <div className="mb-6 flex justify-center">
              <button 
                  onClick={() => setShowCalibration(true)}
                  className="group flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900/60 border border-cyan-500/30 text-cyan-200 text-sm font-orbitron tracking-widest hover:bg-cyan-900/20 hover:border-cyan-400/60 transition-all"
              >
                  <Fingerprint className="w-4 h-4 group-hover:animate-pulse" />
                  {personalFrequency ? `MINHA FREQUÊNCIA: ${personalFrequency.hz} Hz` : 'SINTONIZAR BIOMETRIA'}
              </button>
          </div>

          {/* --- THE REACTOR BUTTON --- */}
          <div className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 animate-pulse">
              <div className="bg-slate-950 rounded-[22px] p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,100,0,0.2),transparent_70%)]"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-orange-500 shadow-[0_0_20px_orange] bg-slate-900`}>
                              <Atom className="w-8 h-8 text-white" />
                          </div>
                          <div>
                              <h2 className="text-2xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-400 to-red-500">
                                  O REATOR
                              </h2>
                              <p className="text-orange-200/60 text-xs font-bold tracking-widest uppercase">Fonte Primordial • Fusão Gamma</p>
                              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                                  O recurso mais poderoso do app. Sincronização hemisférica total via Corpo Caloso.
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                          <button onClick={() => setShowReactorHelp(true)} className="p-2 text-slate-500 hover:text-white"><HelpCircle className="w-5 h-5"/></button>
                          <button
                              onClick={() => toggleFrequency(REACTOR_FREQUENCY)}
                              className={`px-8 py-3 rounded-full font-bold tracking-widest transition-all shadow-xl bg-gradient-to-r from-orange-600 to-red-600 text-white hover:brightness-110`}
                          >
                              ATIVAR REATOR
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Filtered List */}
          <div className="grid grid-cols-1 gap-4">
              {filteredFrequencies.map((freq) => {
                  const isActive = activeFrequencies.includes(freq.id);
                  const theme = getCategoryTheme(freq.category);
                  const isFav = favorites.includes(freq.id);

                  return (
                      <div 
                        key={freq.id}
                        id={freq.id}
                        className={`relative overflow-hidden rounded-2xl border transition-all duration-500 group ${
                            isActive 
                            ? `${theme.bg} ${theme.border} ${theme.shadow} scale-[1.02]` 
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {isActive && (
                            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-5`}></div>
                        )}

                        <div className="p-5 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4 flex-1">
                                <button
                                  onClick={() => toggleFrequency(freq)}
                                  className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-700 shadow-lg border border-white/10 ${
                                      isActive 
                                      ? `bg-gradient-to-br ${theme.gradient} text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]` 
                                      : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                                  }`}
                                >
                                    {isActive ? (
                                        <Square className="w-5 h-5 fill-current" />
                                    ) : (
                                        <Play className="w-5 h-5 fill-current pl-1" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-rajdhani font-bold text-lg leading-tight truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                            {freq.name}
                                        </h3>
                                        <span className={`flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full border bg-opacity-20 whitespace-nowrap ${isActive ? 'border-white/30 text-white' : 'border-slate-700 text-slate-500'}`}>
                                            {freq.hz} Hz
                                        </span>
                                    </div>
                                    <p className={`text-xs leading-relaxed line-clamp-2 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                        {freq.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                                <button 
                                  onClick={(e) => toggleFavorite(e, freq.id)}
                                  className={`p-2 rounded-full transition-colors ${isFav ? 'text-rose-400 bg-rose-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                </button>
                            </div>
                        </div>
                      </div>
                  );
              })}
              
              {filteredFrequencies.length === 0 && (
                  <div className="text-center py-20 text-slate-500">
                      <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma frequência encontrada nesta categoria.</p>
                  </div>
              )}
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}
      {/* SUCCESS MESSAGE TOAST */}
      <div className={`fixed top-40 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${showSuccessMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
         <div className="bg-emerald-500/90 text-white px-6 py-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] backdrop-blur-md flex items-center gap-2 font-bold tracking-wide">
             <CheckCircle2 className="w-5 h-5" />
             Frequência Gerada com Sucesso
         </div>
      </div>

      {/* REACTOR HELP MODAL */}
      {showReactorHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-slate-950 border border-orange-500/30 rounded-2xl max-w-md w-full p-6 relative shadow-[0_0_50px_rgba(255,100,0,0.2)]">
                <button onClick={() => setShowReactorHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Atom className="w-6 h-6 text-orange-500" /> O REATOR (Nível Supremo)
                </h3>
                <div className="space-y-4 text-sm text-slate-300">
                    <p>Você perguntou o que é mais poderoso que a Onda Escalar. A resposta é a <strong>FUSÃO GAMMA</strong>.</p>
                    
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-orange-400 font-bold mb-1">Como Funciona?</h4>
                        <p>Este modo injeta um pulso visual e auditivo de 40Hz (Gamma) diretamente no vácuo criado pelo silêncio escalar.</p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h4 className="text-orange-400 font-bold mb-1">Anatomia Mística</h4>
                        <p>Ao forçar os hemisférios esquerdo e direito a piscarem juntos, o <strong>Corpo Caloso</strong> (a ponte do cérebro) se torna um supercondutor de luz.</p>
                    </div>

                    <p className="text-xs text-center text-slate-500 mt-4">AVISO: Contém luzes estroboscópicas suaves. Não use se tiver fotossensibilidade.</p>
                </div>
            </div>
        </div>
      )}

      {/* SCALAR HELP MODAL */}
      {showScalarHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
                  <button onClick={() => setShowScalarHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  <div className="flex flex-col items-center text-center mb-6">
                      <Infinity className="w-12 h-12 text-slate-200 mb-4" />
                      <h2 className="text-xl font-bold text-white mb-2">Modo Escalar (Zero Point)</h2>
                      <div className="w-16 h-1 bg-slate-500 rounded-full"></div>
                  </div>
                  <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                      <p>O Modo Escalar gera duas ondas idênticas em fase oposta (180º). Quando se encontram, elas se cancelam, criando um <strong>Vácuo Quântico</strong> onde reside a Informação Pura.</p>
                      
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2"><HeadphonesIcon className="w-4 h-4"/> Método 1: Fones (Recomendado)</h3>
                          <p className="text-xs">O som deve diminuir ou sumir "dentro" da sua cabeça. O cancelamento ocorre no cérebro, permitindo que a informação entre direto no subconsciente (Ponto Zero).</p>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Radio className="w-4 h-4"/> Método 2: Broadcast (Não-Local)</h3>
                          <p className="text-xs">Toque no celular (mesmo volume baixo). A onda escalar atua como um transmissor quântico. Sua intenção conecta você à frequência onde quer que esteja.</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* BIOMETRICS CALIBRATION MODAL */}
      {showCalibration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-sm w-full pt-6 pb-8 px-8 relative flex flex-col items-center shadow-[0_0_50px_rgba(6,182,212,0.2)]">
               {!personalFrequency && (
                   <button onClick={() => setShowCalibration(false)} className="absolute top-4 right-4 text-slate-500"><X className="w-5 h-5" /></button>
               )}

               {calibrationStep === 'idle' && personalFrequency && (
                   <>
                      <div className="w-20 h-20 rounded-full bg-cyan-900/30 flex items-center justify-center mb-6 border border-cyan-500/50 shadow-[0_0_20px_cyan]">
                          <Fingerprint className="w-10 h-10 text-cyan-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 text-center">Calibrado</h2>
                      <p className="text-cyan-400 text-3xl font-orbitron mb-4">{personalFrequency.hz} Hz</p>
                      
                      {/* Biometric Advice */}
                      {(() => {
                          const advice = getBiometricAdvice(personalFrequency.hz);
                          return (
                              <div className="mb-6 text-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                  <h4 className={`text-sm font-bold mb-1 ${advice.color}`}>{advice.title}</h4>
                                  <p className="text-xs text-slate-300 leading-relaxed">{advice.text}</p>
                              </div>
                          );
                      })()}

                      <button onClick={resetCalibration} className="flex items-center gap-2 text-slate-300 hover:text-white mb-4">
                          <RefreshCcw className="w-4 h-4" /> Recalibrar
                      </button>
                      <button onClick={() => setShowCalibration(false)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold transition-colors">
                          Continuar
                      </button>
                   </>
               )}

               {(calibrationStep === 'idle' && !personalFrequency) || calibrationStep === 'scanning' ? (
                   <>
                      <h2 className="text-xl font-bold text-white mb-2 text-center">Calibração Biométrica</h2>
                      <p className="text-slate-400 text-center text-xs mb-8">
                         Toque no sensor para leitura do campo bio-elétrico. <br/>
                         <span className="text-cyan-400">Etapa {scanReadings.length + 1} de {MAX_SCANS}</span>
                      </p>
                      
                      {/* FINGERPRINT SCANNER UI */}
                      <div 
                        className="relative w-32 h-32 flex items-center justify-center cursor-pointer mb-8 select-none"
                        onMouseDown={startBiometricScan}
                        onTouchStart={(e) => { e.preventDefault(); startBiometricScan(); }}
                      >
                         {/* Aura */}
                         <div className={`absolute inset-0 bg-cyan-500/20 rounded-full blur-xl transition-all duration-1000 ${isScanning ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`}></div>
                         
                         {/* Icon */}
                         <Fingerprint className={`relative z-10 w-16 h-16 transition-all duration-500 ${isScanning ? 'text-white scale-110' : 'text-cyan-500/50'}`} />
                         
                         {/* Scanning Ring */}
                         {isScanning && (
                             <svg className="absolute inset-0 w-full h-full animate-spin-slow">
                                 <circle cx="64" cy="64" r="60" stroke="cyan" strokeWidth="2" fill="none" strokeDasharray="10 10" className="opacity-50" />
                             </svg>
                         )}
                      </div>

                      {/* Technical Explanation */}
                      <div className="bg-slate-800/50 rounded-xl p-4 w-full">
                          <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-cyan-400" /> Tecnologia de Bio-Feedback
                          </h3>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                              O sensor capacitivo da tela detecta micro-variações na condutividade elétrica da pele (GSR) e pressão. 
                              O algoritmo converte essa variabilidade nervosa em uma frequência Hz correspondente ao seu estado atual.
                          </p>
                      </div>
                   </>
               ) : null}
           </div>
        </div>
      )}

      {/* RESONANCE SIGNS MODAL */}
      {showSigns && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 relative">
                  <button onClick={() => setShowSigns(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" /> Sinais de Ressonância
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 mt-2 rounded-full bg-cyan-400"></div>
                          <span><strong>Calor ou Formigamento:</strong> Sinal de aumento da circulação energética e ativação celular.</span>
                      </li>
                      <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 mt-2 rounded-full bg-cyan-400"></div>
                          <span><strong>Relaxamento Profundo:</strong> Sensação de "peso" agradável, indicando que o cérebro entrou em Alpha/Theta.</span>
                      </li>
                      <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 mt-2 rounded-full bg-cyan-400"></div>
                          <span><strong>Claridade Mental:</strong> Redução drástica do ruído mental e pensamentos repetitivos.</span>
                      </li>
                      <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 mt-2 rounded-full bg-cyan-400"></div>
                          <span><strong>Bocejos ou Suspiros:</strong> Liberação de tensão acumulada no sistema nervoso (Vago).</span>
                      </li>
                  </ul>
              </div>
          </div>
      )}

      {/* TRUST / OFFLINE EXPLANATION MODAL */}
      {showTrustModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 relative">
                  <button onClick={() => setShowTrustModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  <div className="flex flex-col items-center mb-6">
                      {isOffline ? <WifiOff className="w-10 h-10 text-slate-400 mb-2"/> : <Network className="w-10 h-10 text-cyan-400 mb-2"/>}
                      <h3 className="text-lg font-bold text-white">
                          {isOffline ? 'MODO OFFLINE' : 'MODO ONLINE'}
                      </h3>
                  </div>
                  
                  {isOffline ? (
                      <div className="text-sm text-slate-300 space-y-4">
                          <p>Você está desconectado da internet, mas conectado à Matemática Universal.</p>
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                              <h4 className="font-bold text-white mb-1">Como funciona offline?</h4>
                              <p className="text-xs">O app utiliza um algoritmo de <strong>Geometria Sagrada</strong> e a <strong>Sequência de Fibonacci</strong> para converter cada letra da sua intenção em uma frequência harmônica pura. Não é aleatório; é matemática divina.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="text-sm text-slate-300 space-y-4">
                          <p>Você está conectado à nuvem de inteligência generativa.</p>
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                              <h4 className="font-bold text-white mb-1">Como funciona online?</h4>
                              <p className="text-xs">O sistema acessa bancos de dados metafísicos globais para correlacionar sua intenção com as frequências Rife e Solfeggio mais precisas conhecidas.</p>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

// Helper Icon for Headphones
const HeadphonesIcon = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
);

const Radio = ({className}:{className?:string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
  </svg>
)

export default App;