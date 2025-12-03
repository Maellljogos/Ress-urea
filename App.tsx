
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Volume2, 
  Volume1,
  Square, 
  X, 
  Activity, 
  CloudDownload, 
  LogOut, 
  Heart, 
  Play, 
  Pause, 
  ShieldCheck, 
  Infinity, 
  HelpCircle,
  Power,
  Loader2,
  CheckCircle2,
  Search,
  Atom,
  Download,
  Wifi,
  Menu,
  Settings,
  FolderOpen,
  AlertTriangle,
  Globe,
  Trash2,
  ListChecks,
  WifiOff,
  CheckSquare,
  Cloud,
  Check,
  MousePointerClick,
  Disc,
  Shield,
  History,
  Eraser,
  Clock
} from 'lucide-react';
import { PRESET_FREQUENCIES, CATEGORIES, GUARDIAN_FREQUENCY, REACTOR_FREQUENCY, REACTOR_MODES, UPLIFT_FREQUENCY } from './constants';
import { Frequency, FrequencyCategory } from './types';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { generateFrequenciesFromIntent } from './services/geminiService';

// Tiny 1x1 black video loop base64. Playing this forces mobile OS to keep screen ON.
const WAKE_LOCK_VIDEO = "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXQAAAKABaaAgAABAAEAAAB5gAAAAAAAAAAAAAAODW1vb3YAAABsbXZoAAAAAMNs6kHDbOpBAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAABBpb2RzAAAAABQAAAABgAAAAQAAAAAAAAAAAAAAAQAAABJ0cmFrAAAAXHRraGQAAAAdw2zqQcNs6kHDbOpBAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkbWRpYQAAACBtZGhkAAAAAMNs6kHDbOpBAAAAAQAAAAEAAAAAAAARaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAAAAAAB2bWluaGQAAAAAHZtZGhkAAAAAMNs6kHDbOpBAAAAAQAAAAEAAAAAAAARaGRscgAAAAAAAAAAZGluZgAAABRkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEcdHN0YgAAAFhzdHNkAAAAAAAAAAEAAABcaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAEAAQABAAAAAAEgAAACAAFIcHNhbmZwAAAAAAAAAAAAAAQAAQAAAB9ocGRjAAAAAAAAAAAAAAFAAAAAAQAAAAEAABkAAAB4c3R0cwAAAAAAAAABAAAAAQAAAAEAAAAUc3RzeHAAAAABAAAAAQAAAAEAAAAQc3RzYwAAAAAAAAABAAAAAQAAAAEAAAAcc3RzegAAAAAAAAAAAAAAAQAAAAEAAAAUc3RjbwAAAAAAAAABAAAAAAAAYXVkdGEAAAA1bWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcgAAAAAAAAAAAAAAAAAAAAAIL2lsb3QAAAAA";

const App: React.FC = () => {
  const [activeFrequencies, setActiveFrequencies] = useState<string[]>([]);
  const [isScalarMode, setIsScalarMode] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState(''); 
  const [searchMode, setSearchMode] = useState<'INTENT' | 'MATRIX'>('INTENT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFrequencies, setGeneratedFrequencies] = useState<Frequency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // App State
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // New transition state
  const [transitionStep, setTransitionStep] = useState(0);

  const [guardianActive, setGuardianActive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentFrequencies, setRecentFrequencies] = useState<string[]>([]); // RECENT HISTORY STATE

  const [isPlaying, setIsPlaying] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isAudible, setIsAudible] = useState(false);
  
  // Selection / Delete Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null); 
  
  // Deleted Presets (Blacklist)
  const [deletedFreqIds, setDeletedFreqIds] = useState<string[]>([]);

  // Settings & Menu
  const [showMenu, setShowMenu] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'auto' | 'ask'>('auto');

  // Reactor Mode State
  const [selectedReactorMode, setSelectedReactorMode] = useState(REACTOR_MODES[0]);
  const [showReactorUI, setShowReactorUI] = useState(false); 
  const [showReactorHint, setShowReactorHint] = useState(false); // New state for internal hint
  
  // Feedback state
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [networkMsg, setNetworkMsg] = useState<{show: boolean, msg: string, type: 'success' | 'warning'}>({show: false, msg: '', type: 'success'});
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [conflictingIds, setConflictingIds] = useState<string[]>([]); // State for card-specific warnings

  // Guardian Toggle State
  const [guardianEnabledByUser, setGuardianEnabledByUser] = useState(true);

  // Modals
  const [showSigns, setShowSigns] = useState(false);
  const [showScalarHelp, setShowScalarHelp] = useState(false);
  const [showReactorHelp, setShowReactorHelp] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);

  // Refs
  const listTopRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTapRef = useRef<number>(0); 
  const conflictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedFavs = localStorage.getItem('quantum_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedRecents = localStorage.getItem('quantum_recents');
    if (savedRecents) setRecentFrequencies(JSON.parse(savedRecents));

    const savedGenerated = localStorage.getItem('quantum_generated_freqs');
    if (savedGenerated) setGeneratedFrequencies(JSON.parse(savedGenerated));

    const savedDeleted = localStorage.getItem('quantum_deleted_ids');
    if (savedDeleted) setDeletedFreqIds(JSON.parse(savedDeleted));

    const savedDlMode = localStorage.getItem('quantum_download_mode');
    if (savedDlMode === 'ask' || savedDlMode === 'auto') {
        setDownloadMode(savedDlMode);
    }

    audioEngine.setCallback((enginePlaying) => {
      setIsPlaying(enginePlaying);
    });

    const handleOnline = () => {
        setIsOffline(false);
        setNetworkMsg({ show: true, msg: 'Reconectado à Rede Quântica.', type: 'success' });
        setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 4000);
    };
    
    const handleOffline = () => {
        setIsOffline(true);
        setNetworkMsg({ show: true, msg: 'Modo Offline Ativo. Frequências Locais Habilitadas.', type: 'warning' });
        setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isReactorActive = activeFrequencies.includes(REACTOR_FREQUENCY.id);

  // Wake Lock Logic & UI Hint
  useEffect(() => {
    if (isReactorActive) {
        if (videoRef.current) videoRef.current.play().catch(() => {});
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen')
                .then((lock: any) => { wakeLockRef.current = lock; })
                .catch((e: any) => console.log('WakeLock API failed', e));
        }
        
        // Show INTERNAL Reactor Hint
        setShowReactorHint(true);
        const timer = setTimeout(() => setShowReactorHint(false), 4000);
        return () => clearTimeout(timer);

    } else {
        if (videoRef.current) videoRef.current.pause();
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }
        setShowReactorUI(false); 
        setShowReactorHint(false);
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

  const addToRecents = (id: string) => {
      if (id === GUARDIAN_FREQUENCY.id) return;
      
      let newRecents = [id, ...recentFrequencies.filter(rId => rId !== id)];
      if (newRecents.length > 50) newRecents = newRecents.slice(0, 50); // Increased limit
      
      setRecentFrequencies(newRecents);
      localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
  };

  const removeFromRecents = (idToRemove: string) => {
      const newRecents = recentFrequencies.filter(id => id !== idToRemove);
      setRecentFrequencies(newRecents);
      localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
      setSingleDeleteId(null);
      setShowDeleteConfirm(false);
  };

  const clearRecents = () => {
      setRecentFrequencies([]);
      localStorage.setItem('quantum_recents', JSON.stringify([]));
  };

  const handleDownload = async (e: React.MouseEvent, freq: Frequency) => {
    e.stopPropagation();
    setIsDownloading(freq.id);
    await audioEngine.exportFrequencyToFile(freq.hz, freq.name, downloadMode);
    setIsDownloading(null);
  };

  const handleDownloadSelected = async () => {
    if (selectedItems.size === 0) return;
    for (const id of selectedItems) {
        const freq = allFrequencies.find(f => f.id === id);
        if (freq) {
            await audioEngine.exportFrequencyToFile(freq.hz, freq.name, downloadMode);
        }
    }
    setIsSelectionMode(false);
  };

  const changeDownloadMode = (mode: 'auto' | 'ask') => {
      setDownloadMode(mode);
      localStorage.setItem('quantum_download_mode', mode);
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItems(newSet);
  };

  const handleSelectAll = () => {
    const visibleIds = filteredFrequencies.map(f => f.id);
    if (selectedItems.size === visibleIds.length) {
      setSelectedItems(new Set()); // Deselect all if all are selected
    } else {
      setSelectedItems(new Set(visibleIds)); // Select all visible
    }
  };

  const handlePlaySelected = () => {
    selectedItems.forEach(id => {
       const freq = allFrequencies.find(f => f.id === id);
       if (freq && !activeFrequencies.includes(id)) {
          audioEngine.playFrequency(freq.id, freq.hz);
          setActiveFrequencies(prev => [...prev, freq.id]);
          addToRecents(freq.id);
       }
    });
    setIsSelectionMode(false);
  };

  const performDelete = (idsToDelete: string[]) => {
      // If in RECENTES mode, we just remove from history
      if (selectedCategory === 'RECENTES') {
          const newRecents = recentFrequencies.filter(id => !idsToDelete.includes(id));
          setRecentFrequencies(newRecents);
          localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
          
          setSelectedItems(new Set());
          setSingleDeleteId(null);
          setShowDeleteConfirm(false);
          if (selectedItems.size === 0) setIsSelectionMode(false);
          return;
      }

      // Normal Deletion Logic (Hiding from app)
      const generatedIds = generatedFrequencies.map(g => g.id);
      const toRemoveFromGenerated = idsToDelete.filter(id => generatedIds.includes(id));
      const toAddToBlacklist = idsToDelete.filter(id => !generatedIds.includes(id)); 

      if (toRemoveFromGenerated.length > 0) {
          const newGenerated = generatedFrequencies.filter(f => !toRemoveFromGenerated.includes(f.id));
          setGeneratedFrequencies(newGenerated);
          localStorage.setItem('quantum_generated_freqs', JSON.stringify(newGenerated));
      }

      if (toAddToBlacklist.length > 0) {
          const newBlacklist = [...deletedFreqIds, ...toAddToBlacklist];
          setDeletedFreqIds(newBlacklist);
          localStorage.setItem('quantum_deleted_ids', JSON.stringify(newBlacklist));
      }

      idsToDelete.forEach(id => {
          if (activeFrequencies.includes(id)) {
              audioEngine.stopFrequency(id);
          }
      });
      setActiveFrequencies(prev => prev.filter(id => !idsToDelete.includes(id)));

      const newSelection = new Set(selectedItems);
      idsToDelete.forEach(id => newSelection.delete(id));
      setSelectedItems(newSelection);
      setSingleDeleteId(null);
      setShowDeleteConfirm(false);
      
      if (newSelection.size === 0) setIsSelectionMode(false);
  };

  const handleDeleteSelected = () => {
      if (singleDeleteId) {
          if (selectedCategory === 'RECENTES') {
              removeFromRecents(singleDeleteId);
          } else {
              performDelete([singleDeleteId]);
          }
      } else if (selectedItems.size > 0) {
          performDelete(Array.from(selectedItems));
      }
  };

  // --- FREQUENCY LIST FILTERING ---
  const allFrequencies = useMemo(() => [
    ...generatedFrequencies, 
    ...PRESET_FREQUENCIES
  ], [generatedFrequencies]);

  const filteredFrequencies = useMemo(() => {
      let visibleFrequencies = allFrequencies.filter(f => !deletedFreqIds.includes(f.id));

      let result = [];
      if (selectedCategory === 'All') {
          result = visibleFrequencies;
      } else if (selectedCategory === 'FAVORITOS') {
          result = visibleFrequencies.filter(f => favorites.includes(f.id));
      } else if (selectedCategory === 'RECENTES') {
          // Map recents by ID to get the full object, keeping order
          result = recentFrequencies
              .map(id => visibleFrequencies.find(f => f.id === id))
              .filter(Boolean) as Frequency[];
      } else if (selectedCategory === 'ATIVOS') {
          result = visibleFrequencies.filter(f => activeFrequencies.includes(f.id));
      } else {
          result = visibleFrequencies.filter(f => f.category === selectedCategory);
      }

      return result.filter(f => {
          if (!filterTerm) return true;
          const search = filterTerm.toLowerCase();
          return f.name.toLowerCase().includes(search) || f.description.toLowerCase().includes(search);
      });
  }, [allFrequencies, deletedFreqIds, selectedCategory, favorites, activeFrequencies, recentFrequencies, filterTerm]);


  // Guardian Logic
  useEffect(() => {
    if (!hasStarted) return;

    const hasFocusFrequencies = activeFrequencies.some(id => {
      const freq = allFrequencies.find(f => f.id === id);
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
        setTimeout(() => {
            audioEngine.playFrequency(UPLIFT_FREQUENCY.id, UPLIFT_FREQUENCY.hz);
        }, 100);
        setGuardianActive(true);
      }
    } else {
      if (guardianActive) {
        audioEngine.stopFrequency(GUARDIAN_FREQUENCY.id);
        audioEngine.stopFrequency(UPLIFT_FREQUENCY.id);
        setGuardianActive(false);
      }
    }
  }, [activeFrequencies, guardianEnabledByUser, isPlaying, hasStarted, allFrequencies, guardianActive]);

  // Conflict Detection on Specific Cards
  useEffect(() => {
    if (activeFrequencies.length < 2) {
        setConflictingIds([]);
        return;
    }

    const activeObjs = activeFrequencies.map(id => {
        if (id === REACTOR_FREQUENCY.id) return { id, category: FrequencyCategory.HYPER_MATRIX }; 
        return allFrequencies.find(f => f.id === id);
    }).filter(Boolean);

    const sleepFreqs = activeObjs.filter(f => f && f.category === FrequencyCategory.SLEEP);
    const highEnergyFreqs = activeObjs.filter(f => f && (f.category === FrequencyCategory.HYPER_MATRIX || f.category === FrequencyCategory.PERFORMANCE));
    
    if (sleepFreqs.length > 0 && highEnergyFreqs.length > 0) {
        const ids = [...sleepFreqs.map(f => f!.id), ...highEnergyFreqs.map(f => f!.id)];
        setConflictingIds(ids);
    } else {
        setConflictingIds([]);
    }
  }, [activeFrequencies, allFrequencies]);

  const handleEnterApp = () => {
    setIsTransitioning(true);
    audioEngine.init();
    audioEngine.enableBackgroundMode();

    setTimeout(() => setTransitionStep(1), 1500); // "Initializing" (Slower)
    setTimeout(() => setTransitionStep(2), 3000); // "Tuning" (Slower)
    setTimeout(() => {
        setHasStarted(true);
        setIsTransitioning(false);
    }, 4500); // 4.5s transition
  };

  const handleBackToStart = () => {
    setHasStarted(false);
    setShowMenu(false);
  };

  const togglePlayPauseGlobal = () => {
    if (isPlaying) audioEngine.pauseGlobal();
    else audioEngine.resumeGlobal();
  };

  const handleStopAll = () => {
    audioEngine.stopAll();
    setActiveFrequencies([]);
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    setGuardianEnabledByUser(false);
    setGuardianActive(false);
  };

  const toggleAudibleMode = () => {
    const newVal = !isAudible;
    setIsAudible(newVal);
    audioEngine.setSubliminalMode(!newVal); 
  };

  const toggleFrequency = (freq: Frequency) => {
    if (isSelectionMode) {
        toggleSelection(freq.id);
        return;
    }
    setNetworkMsg(prev => prev.type === 'warning' ? { ...prev, show: false } : prev);

    if (activeFrequencies.includes(freq.id)) {
      audioEngine.stopFrequency(freq.id);
      setActiveFrequencies(prev => prev.filter(id => id !== freq.id));
    } else {
      audioEngine.playFrequency(freq.id, freq.hz);
      setActiveFrequencies(prev => [...prev, freq.id]);
      addToRecents(freq.id);
    }
  };

  const toggleScalarMode = () => {
    const newState = !isScalarMode;
    setIsScalarMode(newState);
    audioEngine.enableScalarMode(newState);
  };

  const handleDoubleTap = (e: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 400; 
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          setShowReactorUI(prev => !prev);
      }
      lastTapRef.current = now;
  };

  const handleGenerate = async () => {
    if (!searchTerm.trim()) return;
    setIsGenerating(true);
    const isMatrix = searchMode === 'MATRIX';
    const cat = isMatrix ? FrequencyCategory.HYPER_MATRIX : FrequencyCategory.CUSTOM;
    const newFrequencies = await generateFrequenciesFromIntent(searchTerm, cat);
    
    const updatedGenerated = [...newFrequencies, ...generatedFrequencies];
    setGeneratedFrequencies(updatedGenerated);
    localStorage.setItem('quantum_generated_freqs', JSON.stringify(updatedGenerated));

    setIsGenerating(false);
    setSearchTerm('');
    if (newFrequencies.length > 0) {
        if (!isMatrix) setSelectedCategory('All'); 
        else setSelectedCategory(FrequencyCategory.HYPER_MATRIX);
        setLastGeneratedId(newFrequencies[0].id);
        addToRecents(newFrequencies[0].id); // Auto add to recents
    }
  };

  const getActiveHzStats = () => {
      if (activeFrequencies.length === 0) return { avg: 0, breath: '6s' };
      let total = 0;
      let count = 0;
      activeFrequencies.forEach(id => {
          const f = allFrequencies.find(freq => freq.id === id);
          if (f) {
              total += f.hz;
              count++;
          }
      });
      if (activeFrequencies.includes(REACTOR_FREQUENCY.id)) {
          total += selectedReactorMode.hz; 
          count++;
      }
      if (count === 0) return { avg: 0, breath: '6s' };
      const avg = total / count;
      let breath = '6s';
      if (avg < 10) breath = '10s'; 
      else if (avg > 35) breath = '2s'; 
      else breath = '5s'; 
      return { avg, breath };
  };

  const stats = getActiveHzStats();
  const avgHz = stats.avg;
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
          bg: 'from-cyan-950/40 to-cyan-900/10',
          text: 'text-cyan-100',
          tabText: 'text-white',
          border: 'border-cyan-500/30',
          icon: 'text-cyan-400',
          gradient: 'from-cyan-600 to-blue-500',
          shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]'
        };
      case FrequencyCategory.SLEEP:
        return {
          bg: 'from-indigo-950/60 to-indigo-900/30',
          text: 'text-indigo-100',
          tabText: 'text-white',
          border: 'border-indigo-500/30',
          icon: 'text-indigo-400',
          gradient: 'from-indigo-600 to-violet-500',
          shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]'
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
          tabText: 'text-teal-100',
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

  const getReactorStrobeDuration = () => {
    if (selectedReactorMode.id === 'sleep_core') return '4s';
    if (selectedReactorMode.id === 'lucid_core') return '0.5s';
    return '0.08s'; 
  };

  // --- RENDER: LANDING PAGE & TRANSITION ---
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#020617] text-center flex flex-col items-center justify-center">
        {/* BACKGROUND */}
        <div className="absolute inset-0 bg-[#020617]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)] animate-pulse" style={{ animationDuration: '6s' }}></div>
        </div>

        {/* TRANSITION OVERLAY */}
        {isTransitioning ? (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-fadeIn w-full">
                 <div className="mb-8 scale-150 relative">
                     <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                     <Atom className="w-16 h-16 text-cyan-400 animate-spin" style={{ animationDuration: '0.5s' }} />
                 </div>
                 
                 <div className="h-10 overflow-hidden flex flex-col items-center mb-6 w-full max-w-sm">
                     <div className={`transition-all duration-500 transform ${transitionStep === 1 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} absolute`}>
                         <h2 className="text-lg font-orbitron text-cyan-200 tracking-[0.2em]">INICIALIZANDO SISTEMA...</h2>
                     </div>
                     <div className={`transition-all duration-500 transform ${transitionStep === 2 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} absolute`}>
                         <h2 className="text-lg font-orbitron text-white tracking-[0.2em] glow-text-cyan whitespace-nowrap">CARREGANDO MÓDULOS</h2>
                     </div>
                 </div>
                 
                 <div className="w-64 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan-400 animate-[width_4.5s_ease-out_forwards]" style={{ width: '100%' }}></div>
                 </div>
             </div>
        ) : (
             <div className="relative z-10 flex flex-col items-center w-full max-w-md animate-fade-in-up justify-center h-full">
                
                {/* Visualizer - Lifted Up */}
                <div className="scale-75 h-[280px] flex items-center justify-center -mt-10">
                   <Visualizer isActive={false} forceAnimate={true} speedMultiplier={0.3} breathDuration="10s" />
                </div>

                <div className="flex flex-col items-center gap-1 mb-3 -mt-4 transform-gpu">
                    <h1 className="text-4xl md:text-5xl font-orbitron font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-100 glow-text-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    RESSAUREA
                    </h1>
                    
                    <p className="text-cyan-200/70 text-base font-light tracking-[0.2em] uppercase">
                    Sintonia de Alta Frequência
                    </p>
                </div>

                <div className="bg-slate-900/90 border border-cyan-500/30 px-6 py-5 rounded-xl max-w-xs w-full backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.08)] mb-5 text-center transform-gpu">
                    <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold tracking-wider text-[10px] uppercase mb-3">
                        <ShieldCheck className="w-4 h-4" />
                        <span>BLINDAGEM VIBRACIONAL</span>
                    </div>
                    
                    <div className="space-y-3">
                        <p className="text-lg text-slate-200 font-rajdhani font-extrabold drop-shadow-md">
                            Acesse o <span className="text-cyan-300 glow-text-cyan">Campo de Potencial Infinito</span>.
                        </p>
                        <p className="text-sm text-slate-200 font-medium tracking-wide leading-relaxed opacity-100 drop-shadow-sm">
                            Ao ativar a ressonância, uma cúpula de harmonização envolverá seu campo, garantindo paz e segurança total.
                        </p>
                    </div>
                </div>

                <button
                  onClick={handleEnterApp}
                  className="group relative px-12 py-3 bg-transparent overflow-hidden rounded-full transition-all duration-500 hover:scale-105 transform-gpu"
                >
                  <div className="absolute inset-0 border border-cyan-500/30 rounded-full"></div>
                  <div className="absolute inset-0 bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
                  <div className="relative flex items-center gap-3 text-cyan-100 font-orbitron tracking-widest text-base">
                    <span>ENTRAR</span>
                  </div>
                </button>
            </div>
        )}
      </div>
    );
  }

  // Count active freqs (Normal + Guardian if enabled)
  let activeCount = activeFrequencies.filter(id => id !== REACTOR_FREQUENCY.id && id !== GUARDIAN_FREQUENCY.id && id !== UPLIFT_FREQUENCY.id).length;
  // User asked for Guardian to be counted in the badge visually
  if (guardianActive) activeCount += 1;

  const isAtivosHighlighted = activeCount > 0;
  const isAtivosSelected = selectedCategory === 'ATIVOS';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-cyan-500/30 relative overflow-hidden font-rajdhani antialiased">
      
      <video 
         ref={videoRef}
         loop 
         muted 
         playsInline 
         className="fixed w-1 h-1 -z-10 opacity-0 pointer-events-none top-0 left-0"
         src={WAKE_LOCK_VIDEO}
      />

      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center opacity-60">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.02),transparent_60%)]"></div>
         <Visualizer isActive={isPlaying && activeFrequencies.length > 0} speedMultiplier={speedMult} breathDuration={stats.breath} />
      </div>

      {isReactorActive && (
          <div 
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden transform-gpu group select-none touch-action-none"
            onTouchStart={handleDoubleTap}
            onMouseDown={handleDoubleTap}
          >
              {/* REACTOR OVERLAY CONTENT ... (No changes here) */}
              <div 
                 className={`absolute inset-0 bg-white ${selectedReactorMode.id === 'sleep_core' ? 'animate-pulse' : 'animate-pulse'}`} 
                 style={{ 
                     animationDuration: getReactorStrobeDuration(), 
                     opacity: selectedReactorMode.id === 'sleep_core' ? 0.05 : 0.15,
                     pointerEvents: 'none'
                 }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center scale-150 pointer-events-none">
                  <Visualizer isActive={true} speedMultiplier={selectedReactorMode.id === 'sleep_core' ? 0.2 : 4} breathDuration={selectedReactorMode.id === 'sleep_core' ? '10s' : '1s'} />
              </div>

              {showReactorHint && !showReactorUI && (
                  <div className="absolute bottom-32 flex flex-col items-center animate-fade-in-up">
                      <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white/70">
                          <MousePointerClick className="w-5 h-5 animate-bounce" />
                          <span className="text-xs font-bold uppercase tracking-widest">Toque 2x para Opções</span>
                      </div>
                  </div>
              )}

              <div className={`absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-16 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${showReactorUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-8 bg-slate-900/80 backdrop-blur rounded-full p-1 border border-slate-700">
                      {REACTOR_MODES.map(mode => (
                          <button
                            key={mode.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReactorMode(mode);
                                audioEngine.stopFrequency(REACTOR_FREQUENCY.id);
                                setTimeout(() => {
                                    audioEngine.playFrequency(REACTOR_FREQUENCY.id, mode.hz);
                                }, 50);
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                selectedReactorMode.id === mode.id
                                ? 'bg-orange-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                              {mode.name}
                          </button>
                      ))}
                  </div>

                  <h2 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-400 to-red-500 mb-2">
                      FUSÃO REATOR
                  </h2>
                  <p className="text-orange-200/60 text-sm tracking-[0.5em] font-light uppercase mb-8">
                      {selectedReactorMode.description}
                  </p>

                  <button
                      onClick={(e) => { e.stopPropagation(); toggleFrequency(REACTOR_FREQUENCY); }}
                      className="group flex items-center gap-3 px-8 py-4 rounded-full border border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-200 transition-all"
                  >
                      <Power className="w-6 h-6" />
                      <span className="font-bold tracking-widest">PARAR FUSÃO</span>
                  </button>
              </div>
          </div>
      )}

    {/* CONTENT WRAPPER WITH ANIMATION */}
    <div className="animate-fade-in-slow">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/95 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-8 justify-between">
         <div className="flex items-center gap-4">
             <button onClick={() => setShowMenu(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
                <Menu className="w-6 h-6" />
             </button>
             <h1 className="text-xl font-orbitron font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-cyan-200">
               RESSAUREA
             </h1>
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={() => setGuardianEnabledByUser(!guardianEnabledByUser)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 group ${
                guardianEnabledByUser 
                  ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                  : 'text-slate-500'
              }`}
              title={guardianEnabledByUser ? "Proteção Ativa" : "Proteção Inativa"}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap hidden sm:inline-block">PROTEÇÃO BASE ATIVA</span>
              <div className={`w-8 h-4 rounded-full border flex items-center p-0.5 transition-colors ${guardianEnabledByUser ? 'bg-cyan-500/20 border-cyan-400' : 'bg-slate-700 border-slate-600'}`}>
                   <div className={`w-3 h-3 rounded-full bg-current shadow-sm transition-transform duration-300 ${guardianEnabledByUser ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            </button>
         </div>
      </header>

      {/* FOOTER PLAYER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-xl border-t border-cyan-500/10 h-20 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex items-center">
         <div className="w-full px-8 flex items-center justify-between">
             <button 
               onClick={toggleAudibleMode}
               className="flex flex-col items-center justify-center gap-1 group w-16 flex-shrink-0"
             >
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isAudible ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {isAudible ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
                </div>
                <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                    {isAudible ? 'Audível' : 'Subliminar'}
                </span>
             </button>

             <div className="flex items-center gap-6">
                <button 
                  onClick={handleStopAll} 
                  className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30 hover:bg-red-900/10 flex-shrink-0"
                  title="Parar Tudo"
                >
                    <Square className="w-4 h-4 fill-current" />
                </button>
                
                <button 
                  onClick={togglePlayPauseGlobal}
                  className="group relative w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 opacity-90 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all animate-pulse duration-[3000ms]"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600 shadow-inner border border-white/20"></div>
                    <div className="relative z-10 text-white drop-shadow-md">
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
                    </div>
                </button>
             </div>

             <button 
               onClick={() => setShowSigns(true)}
               className="flex flex-col items-center justify-center gap-1 group w-16 flex-shrink-0"
             >
                <div className="p-1.5 text-slate-500 group-hover:text-cyan-400 transition-all duration-300">
                   <Activity className="w-5 h-5" />
                </div>
                <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 group-hover:text-cyan-400 transition-colors whitespace-nowrap">Sinais</span>
             </button>
         </div>
      </div>

      <main className="pt-16 pb-24">
        
        <div className="sticky top-16 z-40 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5 pt-4 pb-0 shadow-2xl">
           <div className="w-full px-8 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-cyan-900/20 p-3 rounded-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] transform-gpu subpixel-antialiased">
                      <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${isScalarMode ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'bg-slate-900 text-cyan-500 border border-cyan-900'}`}>
                              <Infinity className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400">Modo Escalar</div>
                              <button onClick={() => setShowScalarHelp(true)} className="p-1 text-slate-500 hover:text-cyan-400 rounded-full"><HelpCircle className="w-4 h-4"/></button>
                          </div>
                      </div>
                      <button 
                          onClick={toggleScalarMode}
                          className={`w-10 h-5 rounded-full transition-colors relative ${isScalarMode ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform duration-300 ${isScalarMode ? 'translate-x-6 bg-white shadow-sm' : 'translate-x-1 bg-slate-400'}`}></div>
                      </button>
                  </div>

                  <div className="flex items-center justify-between bg-gradient-to-r from-red-900/20 to-orange-900/20 p-3 rounded-lg border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)] transform-gpu subpixel-antialiased">
                      <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-orange-500/50 shadow-lg ${isReactorActive ? 'bg-orange-500 text-white shadow-[0_0_15px_orange]' : 'bg-slate-900 text-orange-500'}`}>
                              <Atom className={`w-5 h-5 ${isReactorActive ? 'animate-spin' : ''}`} />
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-red-400">O Reator</div>
                              <button onClick={() => setShowReactorHelp(true)} className="p-1 text-slate-500 hover:text-white rounded-full"><HelpCircle className="w-4 h-4"/></button>
                          </div>
                      </div>
                      <button 
                          onClick={() => toggleFrequency(REACTOR_FREQUENCY)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${isReactorActive ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full transition-transform duration-300 ${isReactorActive ? 'translate-x-6 bg-white shadow-sm' : 'translate-x-1 bg-slate-400'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="relative group scroll-mt-24">
                  <div className={`absolute inset-0 bg-gradient-to-r rounded-full blur transition-opacity opacity-0 group-hover:opacity-30 ${searchMode === 'MATRIX' ? 'from-emerald-500 to-green-500' : 'from-cyan-500 to-blue-500'}`}></div>
                  <div className={`relative bg-slate-900/90 border rounded-full flex items-center p-2 shadow-lg transition-colors ${searchMode === 'MATRIX' ? 'border-emerald-500/30 focus-within:border-emerald-500' : 'border-cyan-500/30 focus-within:border-cyan-500'}`}>
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={searchMode === 'MATRIX' ? "O que deseja baixar? (Ex: Inglês, Programação...)" : "Qual sua intenção? (Ex: Prosperidade, Amor...)"}
                        className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-500 pl-4 py-2"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />
                      <div className="flex items-center gap-3 pr-1">
                          <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-1 border border-slate-700">
                              <button 
                                 onClick={() => setSearchMode('INTENT')}
                                 className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all leading-none flex items-center ${searchMode === 'INTENT' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                  INTENÇÃO
                              </button>
                              <button 
                                 onClick={() => setSearchMode('MATRIX')}
                                 className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all leading-none flex items-center ${searchMode === 'MATRIX' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                  MATRIX
                              </button>
                          </div>
                          <button 
                            onClick={() => handleGenerate()}
                            disabled={!searchTerm.trim() || isGenerating}
                            className={`w-10 h-10 flex items-center justify-center rounded-full text-white transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 ${searchMode === 'MATRIX' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                          >
                             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
              </div>

              {/* CATEGORY LIST - Spotify Style (Compact) */}
              <div className="flex gap-[18px] overflow-x-auto pt-4 pb-2 px-8 -mx-8 category-scroll items-center w-[calc(100%+4rem)]">
                  <div className="pl-0"></div>
                  <button
                      onClick={() => handleCategoryChange('All')}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] ${
                          selectedCategory === 'All' 
                          ? 'bg-slate-100 text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                      TODOS
                  </button>

                  {/* ATIVOS (PLAYING) CATEGORY - SMOOTH REVEAL */}
                  <button
                      onClick={() => handleCategoryChange('ATIVOS')}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] ${
                          isAtivosSelected
                            ? 'bg-amber-950/40 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                            : isAtivosHighlighted
                                ? 'bg-amber-950/20 text-amber-500 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse scale-100'
                                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                       <div className="flex items-center gap-2">
                          <Disc className={`w-3.5 h-3.5 ${activeCount > 0 ? 'animate-spin-slow text-amber-400' : ''}`} /> 
                          <span>ATIVOS</span>
                          <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] flex items-center ${activeCount > 0 ? 'max-w-[3rem] opacity-100' : 'max-w-0 opacity-0'}`}>
                             <span className="pl-0.5">({activeCount})</span>
                          </div>
                       </div>
                  </button>

                  {/* RECENTES (HISTORY) CATEGORY */}
                  <button
                      onClick={() => handleCategoryChange('RECENTES')}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] ${
                          selectedCategory === 'RECENTES' 
                          ? 'bg-purple-900/30 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] scale-105' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                      <X className="w-3.5 h-3.5 text-purple-400" /> RECENTES
                  </button>

                  <button
                      onClick={() => handleCategoryChange('FAVORITOS')}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] ${
                          selectedCategory === 'FAVORITOS' 
                          ? 'bg-rose-900/30 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)] scale-105' 
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                      <Heart className="w-3.5 h-3.5 fill-current" /> FAVORITOS
                  </button>

                  {CATEGORIES.map(cat => {
                      const theme = getCategoryTheme(cat);
                      const isSelected = selectedCategory === cat;
                      const textColor = isSelected 
                         ? (cat === FrequencyCategory.ABUNDANCE || cat === FrequencyCategory.PERFORMANCE || cat === FrequencyCategory.ARCHETYPE ? 'text-slate-900' : 'text-white')
                         : 'text-slate-400';

                      return (
                          <button
                              key={cat}
                              onClick={() => handleCategoryChange(cat)}
                              className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] ${
                                  isSelected 
                                  ? `bg-gradient-to-r ${theme.gradient} ${textColor} shadow-lg scale-105` 
                                  : `bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500`
                              }`}
                          >
                              {cat}
                          </button>
                      )
                  })}
                  <div className="pr-12"></div>
              </div>
           </div>
        </div>

        {/* MAIN CONTENT FLUID WIDTH */}
        <div className="w-full px-8 pt-6 min-h-[100vh]" ref={listTopRef}>
          
          <div className="mb-6 space-y-3">
              <div className="relative group scroll-mt-32">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-slate-500" />
                  </div>
                  <input 
                    ref={searchInputRef}
                    type="text"
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    placeholder="Filtrar sua coleção..."
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all placeholder-slate-600"
                  />
              </div>

              {/* RECENTS HEADER ACTIONS */}
              <div className="flex justify-end h-8 items-center gap-3">
                   {selectedCategory === 'RECENTES' && recentFrequencies.length > 0 && !isSelectionMode && (
                        <button 
                            onClick={clearRecents}
                            className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-red-400 bg-transparent px-2 py-1 transition-all group"
                        >
                            <Eraser className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Limpar Histórico
                        </button>
                   )}

                   {!isSelectionMode ? (
                       <button 
                           onClick={() => {
                               setIsSelectionMode(true);
                               setSelectedItems(new Set());
                           }}
                           className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-700 transition-all"
                       >
                           <ListChecks className="w-4 h-4" /> Selecionar Vários
                       </button>
                   ) : (
                       <div className="flex items-center gap-2 animate-fadeIn">
                           <button
                              onClick={handleSelectAll}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 text-xs font-bold border border-slate-600"
                           >
                              <CheckSquare className="w-3 h-3" /> Selecionar Tudo
                           </button>
                       </div>
                   )}
              </div>
          </div>

          {/* === GUARDIAN FREQUENCY BANNER (COMPACT / SLIM REDESIGN) === */}
          {selectedCategory === 'ATIVOS' && guardianEnabledByUser && (
              <div className="mb-6 animate-fade-in-up">
                  <div className="relative overflow-hidden rounded-lg border border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] py-2 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.3)]">
                              <Shield className="w-3.5 h-3.5" />
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h3 className="font-orbitron font-bold text-white text-xs tracking-wider">PROTEÇÃO BASE</h3>
                                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                              </div>
                          </div>
                      </div>
                      
                      <button 
                          onClick={() => setGuardianEnabledByUser(false)}
                          className="group flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-500/30 hover:bg-red-900/30 hover:border-red-500/50 transition-all"
                      >
                          <span className="text-[10px] font-bold text-cyan-300 group-hover:text-red-300 transition-colors uppercase">Desativar</span>
                          <div className="w-5 h-2.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 relative group-hover:border-red-500/50 transition-colors">
                              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_cyan] group-hover:bg-red-400 group-hover:shadow-[0_0_5px_red] transition-all"></div>
                          </div>
                      </button>
                  </div>
              </div>
          )}

          {/* SPOTIFY-LIKE DENSE GRID */}
          {filteredFrequencies.some(f => f.id.startsWith('custom_') || f.id.startsWith('offline_')) && (
             <div className="mb-8">
                 <div className="flex items-center justify-between mb-4 ml-1">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                       <Cloud className="w-3 h-3" /> Minhas Frequências (Geradas)
                    </h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredFrequencies.filter(f => f.id.startsWith('custom_') || f.id.startsWith('offline_')).map(freq => renderCard(freq))}
                 </div>
             </div>
          )}

          {(selectedCategory !== 'All' || filteredFrequencies.some(f => !f.id.startsWith('custom_') && !f.id.startsWith('offline_'))) && (
              <>
                 {selectedCategory === 'All' && (
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Biblioteca do App</h3>
                 )}
                 {/* DENSE GRID LAYOUT */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                    {filteredFrequencies.filter(f => !f.id.startsWith('custom_') && !f.id.startsWith('offline_')).map(freq => renderCard(freq))}
                 </div>
              </>
          )}

          {filteredFrequencies.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-500">
                  {selectedCategory === 'ATIVOS' ? (
                      <>
                        <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma frequência tocando no momento.</p>
                      </>
                  ) : selectedCategory === 'RECENTES' ? (
                      <>
                        <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Seu histórico está vazio.</p>
                      </>
                  ) : (
                      <>
                        <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma frequência encontrada.</p>
                      </>
                  )}
              </div>
          )}
        </div>
      </main>
      </div> {/* End of animate-fade-in-slow wrapper */}

      {/* --- FLOATING UNIFIED ACTION BAR (BOTTOM DOCK) - FIXED POSITIONING FIX --- */}
      {isSelectionMode && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up w-auto max-w-[95vw]">
              <div className="flex items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-full shadow-2xl p-1 gap-1">
                  
                  <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-700/50">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {selectedItems.size}
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase hidden sm:block">Selecionados</span>
                  </div>

                  <div className="flex items-center gap-1">
                      <button 
                          onClick={() => setIsSelectionMode(false)}
                          className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 font-bold rounded-full transition-all text-xs"
                      >
                          Cancelar
                      </button>

                      {selectedItems.size > 0 && (
                          <>
                            {selectedCategory !== 'RECENTES' && (
                                <>
                                    <button 
                                        onClick={handleDownloadSelected}
                                        className="p-2.5 text-cyan-400 hover:bg-cyan-900/20 rounded-full transition-all"
                                        title="Baixar Selecionados"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>

                                    <button 
                                        onClick={handlePlaySelected}
                                        className="p-2.5 text-emerald-400 hover:bg-emerald-900/20 rounded-full transition-all"
                                        title="Tocar Selecionados"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                    </button>
                                </>
                            )}
                            
                            <button 
                                onClick={() => {
                                    if (selectedCategory === 'RECENTES') {
                                        // Direct delete for multiple selection in Recents? 
                                        // The user only specified "no msg" for the X button (single delete). 
                                        // For bulk delete, usually a confirmation is still good, BUT to be consistent with "Limpar Historico" logic,
                                        // let's just trigger the delete without modal if that's the vibe, or keep modal for bulk.
                                        // User said: "E também nem precisa da msg no x dos cartões... só na lixeirinha ai sim."
                                        // This implies the TRASH icon (bulk delete) SHOULD have a message.
                                        setShowDeleteConfirm(true); 
                                    } else {
                                        setShowDeleteConfirm(true);
                                    }
                                }}
                                className="p-2.5 text-red-400 hover:bg-red-900/20 rounded-full transition-all"
                                title={selectedCategory === 'RECENTES' ? "Remover do Histórico" : "Apagar Selecionados"}
                            >
                                {selectedCategory === 'RECENTES' ? <X className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {/* ... Rest of the component (Menu, Modals, etc.) remains same ... */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] flex justify-start bg-black/60 backdrop-blur-sm">
             <div className="bg-slate-900 border-r border-slate-700 w-80 h-full p-6 relative shadow-2xl animate-fade-in-up">
                 <button onClick={() => setShowMenu(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-6 h-6"/></button>
                 
                 <h2 className="text-2xl font-orbitron font-bold text-white mb-8 border-b border-slate-700 pb-4">Menu</h2>
                 
                 <div className="space-y-6">
                     <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status da Rede</h3>
                            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-slate-500' : 'bg-cyan-400 shadow-[0_0_8px_cyan]'}`}></div>
                        </div>
                        <div className="flex items-center gap-3">
                             <Globe className={`w-8 h-8 ${isOffline ? 'text-slate-600' : 'text-cyan-400'}`} />
                             <div>
                                 <p className={`text-sm font-bold ${isOffline ? 'text-slate-300' : 'text-white'}`}>
                                     {isOffline ? 'Modo Offline' : 'Rede Quântica'}
                                 </p>
                                 <p className="text-[10px] text-slate-500">
                                     {isOffline ? 'Banco de dados local ativo.' : 'Conectado à nuvem.'}
                                 </p>
                             </div>
                        </div>
                     </div>

                     <div>
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Settings className="w-3 h-3" /> Configurações
                         </h3>
                         
                         <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                             <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
                                 <FolderOpen className="w-4 h-4 text-cyan-400" /> Destino dos Downloads
                             </div>
                             
                             <div className="space-y-3">
                                 <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${downloadMode === 'auto' ? 'border-cyan-400' : 'border-slate-600'}`}>
                                         {downloadMode === 'auto' && <div className="w-2 h-2 rounded-full bg-cyan-400"></div>}
                                     </div>
                                     <input type="radio" className="hidden" checked={downloadMode === 'auto'} onChange={() => changeDownloadMode('auto')} />
                                     <span className={`text-xs ${downloadMode === 'auto' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                         Automático (Pasta Padrão)
                                     </span>
                                 </label>

                                 <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${downloadMode === 'ask' ? 'border-cyan-400' : 'border-slate-600'}`}>
                                         {downloadMode === 'ask' && <div className="w-2 h-2 rounded-full bg-cyan-400"></div>}
                                     </div>
                                     <input type="radio" className="hidden" checked={downloadMode === 'ask'} onChange={() => changeDownloadMode('ask')} />
                                     <span className={`text-xs ${downloadMode === 'ask' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                         Escolher Pasta (Manual)
                                     </span>
                                 </label>
                             </div>
                         </div>
                     </div>

                     <div className="border-t border-slate-700 pt-6">
                         <button 
                             onClick={handleBackToStart}
                             className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors w-full"
                         >
                             <LogOut className="w-5 h-5" />
                             <span>Voltar ao Início</span>
                         </button>
                     </div>
                 </div>
             </div>
             <div className="flex-1" onClick={() => setShowMenu(false)}></div>
        </div>
      )}

      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 relative shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-2 text-center">
                      {selectedCategory === 'RECENTES' ? "Limpar do Histórico?" : "Apagar Frequências?"}
                  </h3>
                  <p className="text-slate-400 text-center text-sm mb-6">
                      {singleDeleteId 
                        ? (selectedCategory === 'RECENTES' ? <span>Remover esta frequência dos recentes?</span> : <span>Deseja apagar esta frequência permanentemente?</span>)
                        : (selectedCategory === 'RECENTES' ? <span>Remover <span className="text-red-400 font-bold">{selectedItems.size}</span> itens do histórico?</span> : <span>Você selecionou <span className="text-red-400 font-bold">{selectedItems.size}</span> itens para exclusão.</span>)
                      }
                      <br/>
                      <span className="text-xs mt-2 block opacity-70">
                          {selectedCategory === 'RECENTES' ? "A frequência continuará existindo no app." : "Elas serão removidas da sua lista visual."}
                      </span>
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => { setShowDeleteConfirm(false); setSingleDeleteId(null); }}
                          className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleDeleteSelected}
                          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                      >
                          {selectedCategory === 'RECENTES' ? "Remover" : "Apagar"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className={`fixed top-40 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${showSuccessMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
         <div className="bg-emerald-500/90 text-white px-6 py-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] backdrop-blur-md flex items-center gap-2 font-bold tracking-wide">
             <CheckCircle2 className="w-5 h-5" />
             Frequência Gerada com Sucesso
         </div>
      </div>

      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${networkMsg.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
         <div className={`px-6 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 font-bold tracking-wide text-xs ${networkMsg.type === 'success' ? 'bg-cyan-500/90 text-white shadow-cyan-500/20' : 'bg-amber-500/90 text-white shadow-amber-500/20'}`}>
             {networkMsg.type === 'success' ? <Wifi className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
             {networkMsg.msg}
         </div>
      </div>
    </div>
  );

  function renderCard(freq: Frequency) {
      if (freq.id === GUARDIAN_FREQUENCY.id) return null;

      const isActive = activeFrequencies.includes(freq.id);
      const isConflicting = conflictingIds.includes(freq.id);
      const theme = getCategoryTheme(freq.category);
      const isFav = favorites.includes(freq.id);
      const downloading = isDownloading === freq.id;
      const isSelectedForDelete = selectedItems.has(freq.id);
      
      return (
          <div 
            key={freq.id}
            id={freq.id}
            onClick={() => isSelectionMode && toggleSelection(freq.id)}
            className={`relative overflow-hidden rounded-lg border transition-all duration-500 group transform-gpu subpixel-antialiased [backface-visibility:hidden] h-auto min-h-[140px] flex flex-col ${
                isSelectionMode 
                   ? isSelectedForDelete 
                       ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-[0.98]' 
                       : 'bg-slate-900/40 border-slate-600 hover:border-slate-400 cursor-pointer'
                   : isActive 
                       ? `${theme.bg} ${theme.border} ${theme.shadow} scale-[1.02]` 
                       : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
            }`}
          >
            {isActive && !isSelectionMode && (
                <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-5`}></div>
            )}

            {/* CONFLICT WARNING OVERLAY (IMPROVED POSITIONING) */}
            {isConflicting && !isSelectionMode && isActive && (
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 w-full flex justify-center pointer-events-none">
                     <div className="bg-amber-500 text-black text-[9px] font-bold px-3 py-1 rounded-b-lg shadow-[0_4px_10px_rgba(245,158,11,0.5)] border-x border-b border-amber-300 flex items-center gap-1.5 transform-gpu animate-pulse">
                         <AlertTriangle className="w-3 h-3" />
                         <span>CONFLITO</span>
                     </div>
                 </div>
            )}
            
            {isSelectionMode && (
                <div className="absolute top-3 right-3 z-20 animate-fade-in-up">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelectedForDelete ? 'bg-cyan-500 border-cyan-500 shadow-lg' : 'border-slate-500 bg-slate-900/50'}`}>
                        {isSelectedForDelete && <Check className="w-3 h-3 text-white" />}
                    </div>
                </div>
            )}

            <div className={`p-4 flex items-center justify-between relative z-10 ${isSelectionMode ? 'pointer-events-none' : ''} h-full`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFrequency(freq); }}
                      className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-700 shadow-lg border border-white/10 ${
                          isActive 
                          ? `bg-gradient-to-br ${theme.gradient} text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]` 
                          : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                      }`}
                      disabled={isSelectionMode}
                    >
                        {isActive ? (
                            <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center shadow-inner">
                                <Square className="w-3.5 h-3.5 fill-white text-white" />
                            </div>
                        ) : (
                            <Play className="w-4 h-4 fill-current pl-0.5" />
                        )}
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col h-full items-center justify-center">
                        <div className="flex justify-between items-center w-full gap-2 pr-2 mb-1">
                            <h3 className={`font-rajdhani font-extrabold text-lg leading-tight break-words ${isActive ? 'text-white' : 'text-slate-100'}`}>
                                {freq.name}
                            </h3>
                            <span className={`flex items-center justify-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-opacity-20 whitespace-nowrap flex-shrink-0 mt-0.5 ${isActive ? 'border-white/30 text-white' : 'border-slate-700 text-slate-500'}`}>
                                {freq.hz} Hz
                            </span>
                        </div>
                        <p className={`text-sm leading-relaxed font-medium break-words w-full ${isActive ? 'text-slate-200' : 'text-slate-300'}`}>
                            {freq.description}
                        </p>
                    </div>
                </div>

                <div className={`flex flex-col gap-1 ml-3 flex-shrink-0 transition-opacity duration-300 ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <button 
                    onClick={(e) => toggleFavorite(e, freq.id)}
                    className={`p-1.5 rounded-full transition-colors ${isFav ? 'text-rose-400 bg-rose-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                    disabled={isSelectionMode}
                    >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                    onClick={(e) => handleDownload(e, freq)}
                    className={`p-1.5 rounded-full transition-colors ${downloading ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-600 hover:text-cyan-400'}`}
                    title="Baixar Áudio"
                    disabled={isSelectionMode}
                    >
                        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (selectedCategory === 'RECENTES') {
                                // Direct remove for single item in Recents
                                removeFromRecents(freq.id);
                            } else {
                                setSingleDeleteId(freq.id); 
                                setShowDeleteConfirm(true); 
                            }
                        }}
                        className="p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        title={selectedCategory === 'RECENTES' ? "Remover do Histórico" : "Apagar Frequência"}
                    >
                        {selectedCategory === 'RECENTES' ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
          </div>
      );
  }
};

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
