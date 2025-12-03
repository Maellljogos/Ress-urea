
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
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center bg-[#020617] text-center z-[9999]">
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
             <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md animate-fade-in-up">
                
                {/* Visualizer */}
                <div className="scale-75 h-[280px] flex items-center justify-center -mt-8">
                   <Visualizer isActive={false} forceAnimate={true} speedMultiplier={0.3} breathDuration="10s" />
                </div>

                <div className="flex flex-col items-center gap-1 mb-6 -mt-4 transform-gpu">
                    <h1 className="text-4xl md:text-5xl font-orbitron font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-100 glow-text-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    RESSAUREA
                    </h1>
                    
                    <p className="text-cyan-200/70 text-base font-light tracking-[0.2em] uppercase">
                    Sintonia de Alta Frequência
                    </p>
                </div>

                <div className="bg-slate-900/90 border border-cyan-500/30 px-6 py-6 rounded-xl max-w-sm w-full backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.08)] mb-6 text-center transform-gpu">
                    <div className="flex items-center justify-center gap-2 mb-3 text-cyan-400">
                        <ShieldCheck size={20} />
                        <span className="text-xs font-bold tracking-widest uppercase">Blindagem Vibracional</span>
                    </div>
                    <p className="text-white font-medium text-sm leading-relaxed drop-shadow-md">
                        Acesse o <span className="text-cyan-300 font-bold">Campo de Potencial Infinito</span>.
                    </p>
                    <p className="text-slate-300 font-medium text-xs mt-2 leading-relaxed">
                        Ao ativar a ressonância, uma cúpula de harmonização envolverá seu campo, garantindo paz e segurança total.
                    </p>
                </div>

                <button 
                    onClick={handleEnterApp}
                    className="group relative px-12 py-3 bg-transparent overflow-hidden rounded-full border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                >
                    <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all duration-500"></div>
                    <span className="relative font-orbitron tracking-[0.2em] text-cyan-100 group-hover:text-white transition-colors text-lg">
                        ENTRAR
                    </span>
                </button>
             </div>
        )}
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-32 animate-fade-in-slow">
      <video ref={videoRef} loop muted playsInline className="hidden">
          <source src={WAKE_LOCK_VIDEO} type="video/mp4" />
      </video>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800/60 shadow-lg">
        <div className="px-4 h-16 flex items-center justify-between max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-3">
             <button onClick={() => setShowMenu(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Menu className="text-slate-400" size={24} />
             </button>
             <h1 
                onClick={handleBackToStart}
                className="text-xl md:text-2xl font-orbitron font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 cursor-pointer"
             >
              RESSAUREA
             </h1>
          </div>

          <div className="flex items-center gap-4">
             {/* Guardian Toggle Switch (Visual) */}
             <div 
               onClick={() => setGuardianEnabledByUser(!guardianEnabledByUser)}
               className={`hidden md:flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full transition-all border ${guardianEnabledByUser ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-slate-900 border-slate-700'}`}
             >
                <span className={`text-[10px] font-bold tracking-wider ${guardianEnabledByUser ? 'text-cyan-400' : 'text-slate-500'}`}>
                    PROTEÇÃO BASE {guardianEnabledByUser ? 'ATIVA' : 'OFF'}
                </span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${guardianEnabledByUser ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${guardianEnabledByUser ? 'left-4.5 translate-x-[14px]' : 'left-0.5'}`}></div>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="px-6 md:px-8 py-6 max-w-[1920px] mx-auto w-full">
        {/* --- GLOBAL CONTROLS (SCALAR & REACTOR) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* SCALAR MODE BUTTON */}
            <div 
                className={`relative overflow-hidden p-0.5 rounded-xl transition-all duration-500 ${isScalarMode ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_25px_rgba(6,182,212,0.3)]' : 'bg-slate-800'}`}
            >
                <div className="relative h-full bg-[#020617] rounded-[10px] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isScalarMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Infinity size={20} />
                        </div>
                        <div>
                            <h3 className={`font-orbitron text-sm font-bold ${isScalarMode ? 'text-cyan-100' : 'text-slate-400'}`}>Modo Escalar</h3>
                        </div>
                        <HelpCircle 
                           size={14} 
                           className="text-slate-600 hover:text-cyan-400 cursor-pointer transition-colors"
                           onClick={(e) => { e.stopPropagation(); setShowScalarHelp(true); }}
                        />
                    </div>
                    
                    {/* TOGGLE SWITCH */}
                    <div 
                        onClick={toggleScalarMode}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${isScalarMode ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isScalarMode ? 'left-7' : 'left-1'}`}></div>
                    </div>
                </div>
            </div>

            {/* REACTOR MODE BUTTON */}
            <div 
                className={`relative overflow-hidden p-0.5 rounded-xl transition-all duration-500 ${isReactorActive ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_0_25px_rgba(249,115,22,0.3)]' : 'bg-slate-800'}`}
            >
                <div 
                    className="relative h-full bg-[#020617] rounded-[10px] p-4 flex items-center justify-between cursor-pointer"
                    onClick={(e) => handleDoubleTap(e)}
                >
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isReactorActive ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Atom size={20} className={isReactorActive ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                        </div>
                        <div>
                             <h3 className={`font-orbitron text-sm font-bold ${isReactorActive ? 'text-orange-100' : 'text-slate-400'}`}>O Reator</h3>
                        </div>
                        <HelpCircle 
                           size={14} 
                           className="text-slate-600 hover:text-orange-400 cursor-pointer transition-colors"
                           onClick={(e) => { e.stopPropagation(); setShowReactorHelp(true); }}
                        />
                    </div>

                    {/* TOGGLE SWITCH */}
                    <div 
                         onClick={(e) => { e.stopPropagation(); toggleFrequency(REACTOR_FREQUENCY); }}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${isReactorActive ? 'bg-orange-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isReactorActive ? 'left-7' : 'left-1'}`}></div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SEARCH & AI GENERATION --- */}
        <div className="relative mb-8 group">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
           </div>
           <input 
              ref={searchInputRef}
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Qual sua intenção? (Ex: Prosperidade, Amor...)"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-full py-3.5 pl-11 pr-32 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
           />
           <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
               <div className="flex bg-slate-800 rounded-full p-0.5 mr-1">
                  <button 
                     onClick={() => setSearchMode('INTENT')}
                     className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${searchMode === 'INTENT' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    INTENÇÃO
                  </button>
                  <button 
                     onClick={() => setSearchMode('MATRIX')}
                     className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${searchMode === 'MATRIX' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    MATRIX
                  </button>
               </div>
               <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !searchTerm.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
               >
                  {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <CloudDownload size={18} />}
               </button>
           </div>
        </div>

        {/* --- CATEGORY TABS --- */}
        <div className="relative mb-6">
           <div 
             ref={listTopRef}
             className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide snap-x w-full"
           >
              {/* ALL BUTTON */}
              <button
                onClick={() => handleCategoryChange('All')}
                className={`snap-start flex-shrink-0 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 transform-gpu ${selectedCategory === 'All' ? 'bg-white text-slate-900 border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                TODOS
              </button>
              
              {/* ACTIVE BUTTON */}
              <div className="relative flex-shrink-0">
                  <button
                    onClick={() => handleCategoryChange('ATIVOS')}
                    className={`snap-start relative px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-500 transform-gpu flex items-center gap-2 overflow-hidden ${selectedCategory === 'ATIVOS' ? 'bg-slate-900 border-transparent text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)] scale-105' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'} ${activeFrequencies.length > 0 && selectedCategory !== 'ATIVOS' ? 'border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : ''}`}
                  >
                    <Disc size={14} className={activeFrequencies.length > 0 ? 'animate-spin-slow' : ''} />
                    <span>ATIVOS</span>
                    
                    {/* Smooth Reveal Counter */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden flex items-center ${activeFrequencies.length > 0 ? 'max-w-[30px] opacity-100 ml-1' : 'max-w-0 opacity-0'}`}>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded-full">
                           {activeFrequencies.length + (guardianEnabledByUser && !activeFrequencies.includes(GUARDIAN_FREQUENCY.id) && isPlaying ? 1 : 0)}
                        </span>
                    </div>
                  </button>
              </div>

              {/* RECENTS BUTTON */}
              <button
                onClick={() => handleCategoryChange('RECENTES')}
                className={`snap-start flex-shrink-0 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 transform-gpu flex items-center gap-2 ${selectedCategory === 'RECENTES' ? 'bg-slate-800 text-purple-300 border-transparent shadow-[0_0_15px_rgba(216,180,254,0.2)] scale-105' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                <Clock size={14} />
                RECENTES
              </button>

              {/* FAVORITES BUTTON */}
              <button
                onClick={() => handleCategoryChange('FAVORITOS')}
                className={`snap-start flex-shrink-0 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 transform-gpu flex items-center gap-2 ${selectedCategory === 'FAVORITOS' ? 'bg-slate-800 text-pink-300 border-transparent shadow-[0_0_15px_rgba(249,168,212,0.2)] scale-105' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                <Heart size={14} fill={selectedCategory === 'FAVORITOS' ? "currentColor" : "none"} />
                FAVORITOS
              </button>

              {/* CATEGORY LIST */}
              {CATEGORIES.map(cat => {
                const theme = getCategoryTheme(cat);
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`snap-start flex-shrink-0 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 transform-gpu ${isSelected ? `bg-slate-900 ${theme.tabText} border-transparent ${theme.shadow} scale-105` : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                  >
                    {cat}
                  </button>
                );
              })}
           </div>
        </div>

        {/* --- GUARDIAN BANNER (INSIDE ACTIVOS) --- */}
        {selectedCategory === 'ATIVOS' && guardianEnabledByUser && (
            <div className="mb-6 relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-lg animate-fade-in-up">
                <div className="absolute inset-0 bg-cyan-950/20"></div>
                <div className="relative p-3 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-900/30 rounded-lg text-cyan-400">
                             <Shield size={20} />
                        </div>
                        <div>
                             <h4 className="text-sm font-bold text-cyan-100">Proteção Base do Sistema</h4>
                             <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider">Escudo de Frequência 432Hz Ativo</p>
                        </div>
                     </div>
                     <div 
                       onClick={() => setGuardianEnabledByUser(!guardianEnabledByUser)}
                       className="cursor-pointer"
                     >
                         <div className={`w-10 h-5 rounded-full relative transition-colors ${guardianEnabledByUser ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${guardianEnabledByUser ? 'left-6' : 'left-1'}`}></div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- HISTORY TOOLS --- */}
        {selectedCategory === 'RECENTES' && recentFrequencies.length > 0 && (
             <div className="flex justify-end mb-4 animate-fade-in-up">
                 <div className="flex items-center gap-3">
                     <button 
                        onClick={() => setIsSelectionMode(!isSelectionMode)}
                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                         <ListChecks size={14} />
                         Selecionar Vários
                     </button>
                     <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                     >
                         <Eraser size={14} />
                         Limpar Tudo
                     </button>
                 </div>
             </div>
        )}

        {/* --- MULTI-SELECT TOOLBAR (STANDARD) --- */}
        {!isSelectionMode && selectedCategory !== 'RECENTES' && (
             <div className="flex justify-end mb-4">
                 <button 
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider"
                 >
                    <ListChecks size={16} />
                    Selecionar Vários
                 </button>
             </div>
        )}

        {/* --- FREQUENCY GRID (SPOTIFY-LIKE) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-4">
            {filteredFrequencies.map((freq) => {
              const isActive = activeFrequencies.includes(freq.id);
              const isSelected = selectedItems.has(freq.id);
              const theme = getCategoryTheme(freq.category);
              const isConflicting = conflictingIds.includes(freq.id) && isActive;

              return (
                <div 
                  key={freq.id}
                  id={freq.id}
                  onClick={() => toggleFrequency(freq)}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-300 transform-gpu cursor-pointer flex flex-col h-full [backface-visibility:hidden]
                    ${isActive 
                        ? `bg-gradient-to-br ${theme.bg} ${theme.border} shadow-[0_0_20px_rgba(0,0,0,0.3)]` 
                        : `bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40`
                    }
                    ${isSelected ? 'ring-2 ring-cyan-400 border-transparent' : ''}
                    ${isConflicting ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse' : ''}
                  `}
                >
                  {/* CONFLICT WARNING BADGE - TOP EDGE */}
                  {isConflicting && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-amber-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-lg flex items-center gap-1 animate-bounce">
                          <AlertTriangle size={10} strokeWidth={3} />
                          CONFLITO
                      </div>
                  )}

                  <div className="p-4 flex flex-col h-full relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-3 mb-2">
                        {/* Play Button - Centered Vertically */}
                        <div className="flex items-center h-full pt-1"> 
                           <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isActive ? `bg-white text-slate-900 scale-110` : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:scale-105'}`}
                           >
                              {isActive ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5"/>}
                           </div>
                        </div>

                        {/* Hz Badge */}
                        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${isActive ? 'bg-black/30 border-white/20 text-white' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>
                           {freq.hz} Hz
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 mt-1">
                        <h3 className={`font-extrabold text-lg leading-tight mb-1 transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                            {freq.name}
                        </h3>
                        <p className={`text-sm font-medium leading-snug transition-colors ${isActive ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                            {freq.description}
                        </p>
                    </div>

                    {/* Actions Row */}
                    <div className={`flex items-center justify-end gap-2 mt-4 transition-opacity duration-300 ${isSelectionMode ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Favorite */}
                        <button 
                            onClick={(e) => toggleFavorite(e, freq.id)}
                            className={`p-1.5 rounded-lg transition-colors ${favorites.includes(freq.id) ? 'text-pink-400' : 'text-slate-600 hover:text-pink-300'}`}
                        >
                            <Heart size={16} fill={favorites.includes(freq.id) ? "currentColor" : "none"} />
                        </button>

                        {/* Download */}
                        <button 
                             onClick={(e) => handleDownload(e, freq)}
                             className={`p-1.5 rounded-lg transition-colors ${isDownloading === freq.id ? 'text-cyan-400 animate-pulse' : 'text-slate-600 hover:text-cyan-300'}`}
                        >
                            {isDownloading === freq.id ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                        </button>

                        {/* Delete / Remove History */}
                        <button 
                             onClick={(e) => { e.stopPropagation(); setSingleDeleteId(freq.id); setShowDeleteConfirm(true); }}
                             className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                        >
                            {/* IF RECENTES -> 'X' (Remove), ELSE -> 'Trash' (Delete) */}
                            {selectedCategory === 'RECENTES' ? <X size={16} /> : <Trash2 size={16} />}
                        </button>
                    </div>

                    {/* Selection Overlay Checkmark */}
                    {isSelected && (
                        <div className="absolute top-2 right-2 text-cyan-400 bg-cyan-950/50 rounded-full p-1 shadow-sm animate-in zoom-in duration-200">
                            <CheckCircle2 size={18} fill="currentColor" className="text-cyan-950" />
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </main>

      {/* --- SELECTION DOCK --- */}
      {isSelectionMode && selectedItems.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
              <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl flex items-center p-2 gap-4 pr-4">
                   {/* Counter */}
                   <div className="pl-3 pr-4 border-r border-slate-700 flex flex-col justify-center">
                        <span className="text-xl font-bold text-white leading-none text-center">{selectedItems.size}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Selecionados</span>
                   </div>
                   
                   {/* Actions */}
                   <div className="flex items-center gap-2">
                       <button 
                          onClick={() => setIsSelectionMode(false)}
                          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold uppercase transition-colors"
                       >
                           Cancelar
                       </button>

                       <button 
                          onClick={handleDownloadSelected}
                          className="px-4 py-2 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 text-xs font-bold uppercase transition-colors flex items-center gap-2"
                       >
                           <Download size={14} />
                           Baixar
                       </button>

                       <button 
                          onClick={handlePlaySelected}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold uppercase transition-colors shadow-lg shadow-emerald-900/50 flex items-center gap-2"
                       >
                           <Play size={14} fill="currentColor" />
                           Tocar
                       </button>

                       <button 
                          onClick={handleDeleteSelected}
                          className="px-4 py-2 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/80 text-xs font-bold uppercase transition-colors border border-red-900"
                       >
                           {selectedCategory === 'RECENTES' ? 'Remover' : 'Apagar'}
                       </button>
                   </div>
              </div>
          </div>
      )}

      {/* --- REACTOR UI OVERLAY --- */}
      {showReactorUI && (
         <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-fadeIn">
            <button 
               onClick={() => setShowReactorUI(false)}
               className="absolute top-6 right-6 text-slate-500 hover:text-white"
            >
               <X size={32} />
            </button>
            
            <div className="text-center mb-8">
               <div className="inline-block p-4 rounded-full bg-orange-500/10 mb-4 animate-pulse">
                  <Atom size={64} className="text-orange-500 animate-spin" style={{ animationDuration: '4s' }}/>
               </div>
               <h2 className="text-3xl font-orbitron font-bold text-white mb-2 tracking-widest">O REATOR</h2>
               <p className="text-orange-400 text-sm tracking-widest uppercase">Núcleo de Fusão Escalar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-6">
               {REACTOR_MODES.map(mode => (
                  <button
                     key={mode.id}
                     onClick={() => setSelectedReactorMode(mode)}
                     className={`p-6 rounded-2xl border transition-all duration-300 group text-left relative overflow-hidden ${selectedReactorMode.id === mode.id ? 'bg-orange-950/30 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                  >
                     <div className={`absolute top-0 left-0 w-1 h-full transition-all ${selectedReactorMode.id === mode.id ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                     <div className="mb-3 flex justify-between items-start">
                        <span className={`text-xs font-bold px-2 py-1 rounded bg-black/50 ${selectedReactorMode.id === mode.id ? 'text-orange-400' : 'text-slate-500'}`}>{mode.hz} Hz</span>
                        {selectedReactorMode.id === mode.id && <Activity size={18} className="text-orange-500 animate-pulse" />}
                     </div>
                     <h3 className={`font-bold text-lg mb-1 ${selectedReactorMode.id === mode.id ? 'text-white' : 'text-slate-300'}`}>{mode.name}</h3>
                     <p className="text-xs text-slate-500 leading-relaxed">{mode.description}</p>
                  </button>
               ))}
            </div>

            {/* INTERNAL HINT */}
            {showReactorHint && (
                <div className="mt-12 flex items-center gap-2 text-slate-500 animate-pulse bg-black/50 px-4 py-2 rounded-full border border-slate-800">
                    <MousePointerClick size={16} />
                    <span className="text-xs tracking-widest uppercase">Toque duas vezes para Opções</span>
                </div>
            )}
         </div>
      )}

      {/* --- FOOTER / VISUALIZER BAR --- */}
      {hasStarted && (
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#020617]/90 backdrop-blur-xl border-t border-slate-800/50 z-40 flex items-center justify-between px-6 md:px-12">
           <div className="hidden md:flex flex-col">
               <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-1">Subliminar</span>
               <div className="flex items-center gap-3">
                   <button onClick={toggleAudibleMode} className="text-slate-400 hover:text-white transition-colors">
                       {isAudible ? <Volume2 size={18} /> : <Volume1 size={18} />}
                   </button>
               </div>
           </div>

           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-8">
               {/* Stop Button */}
               <button 
                  onClick={handleStopAll}
                  className="p-3 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all active:scale-95"
                  title="Parar Tudo"
               >
                   <Square size={12} fill="currentColor" />
               </button>

               {/* Main Visualizer/Play Toggle */}
               <div className="relative group cursor-pointer" onClick={togglePlayPauseGlobal}>
                   <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-400/30 transition-all duration-500"></div>
                   <div className="relative w-16 h-16 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center shadow-2xl overflow-hidden">
                       <Visualizer isActive={isPlaying && activeFrequencies.length > 0} speedMultiplier={speedMult} breathDuration={stats.breath} />
                       
                       {/* Overlay Icon */}
                       <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 hover:bg-black/10 transition-colors">
                            {isPlaying ? <Pause fill="white" size={20} className="text-white drop-shadow-md" /> : <Play fill="white" size={20} className="text-white ml-1 drop-shadow-md" />}
                       </div>
                   </div>
               </div>
               
               {/* Reactor Status */}
               <button 
                  onClick={(e) => {
                      if(!activeFrequencies.includes(REACTOR_FREQUENCY.id)) toggleFrequency(REACTOR_FREQUENCY);
                      else handleDoubleTap(e);
                  }}
                  className={`p-3 rounded-full transition-all active:scale-95 ${isReactorActive ? 'text-orange-500 bg-orange-950/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'text-slate-500 hover:text-orange-400'}`}
                  title="Reator"
               >
                   <Atom size={18} className={isReactorActive ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
               </button>
           </div>

           <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-1">Sinais</span>
               <button 
                  onClick={() => setShowSigns(true)}
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
               >
                   <Activity size={18} />
               </button>
           </div>
        </div>
      )}

      {/* --- MODALS & ALERTS --- */}
      
      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in-up">
                  <h3 className="text-lg font-bold text-white mb-2">
                      {selectedCategory === 'RECENTES' ? 'Remover do Histórico?' : 'Apagar Definitivamente?'}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                      {selectedCategory === 'RECENTES' 
                        ? 'Isso apenas remove o item da lista de recentes. O arquivo original permanece no app.'
                        : 'Você está prestes a excluir este item. Se for um arquivo gerado, ele será perdido.'}
                  </p>
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs uppercase hover:bg-slate-700"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-500 shadow-lg shadow-red-900/50"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* SUCCESS TOAST */}
      {showSuccessMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-6 py-3 rounded-full backdrop-blur-md shadow-lg flex items-center gap-3 animate-fade-in-up">
           <CheckCircle2 size={20} />
           <span className="text-sm font-bold">Frequência Gerada com Sucesso</span>
        </div>
      )}

      {/* NETWORK TOAST */}
      {networkMsg.show && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full backdrop-blur-md shadow-lg flex items-center gap-3 animate-fade-in-up border ${networkMsg.type === 'success' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-amber-500/10 border-amber-500/50 text-amber-400'}`}>
           {networkMsg.type === 'success' ? <Wifi size={20} /> : <WifiOff size={20} />}
           <span className="text-sm font-bold">{networkMsg.msg}</span>
        </div>
      )}
      
      {/* SIGNS MODAL */}
      {showSigns && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSigns(false)}>
           <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setShowSigns(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
               <h3 className="text-xl font-orbitron font-bold text-cyan-400 mb-4 flex items-center gap-2">
                   <Activity size={24} /> Sinais de Ressonância
               </h3>
               <ul className="space-y-3 text-slate-300 text-sm">
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Calor ou Formigamento:</strong> Fluxo de energia ativado (Chi/Prana).</span></li>
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Bocejos ou Suspiros:</strong> Liberação de bloqueios energéticos.</span></li>
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Pressão na Testa:</strong> Ativação da glândula pineal (3º Visão).</span></li>
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Gosto Metálico:</strong> Desintoxicação vibracional intensa (Boca).</span></li>
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Paz Súbita:</strong> Alinhamento com o Ponto Zero.</span></li>
                   <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5"></div><span><strong>Sonolência:</strong> O cérebro entrando em ondas Theta/Delta para cura.</span></li>
               </ul>
           </div>
        </div>
      )}

      {/* SCALAR HELP MODAL */}
      {showScalarHelp && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowScalarHelp(false)}>
           <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setShowScalarHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
               <h3 className="text-xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                   Ondas Escalares
               </h3>
               <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Tecnologia Zero Point</p>
               <p className="text-slate-300 text-sm leading-relaxed mb-4">
                   Diferente das ondas hertzianas comuns que viajam em linha, as Ondas Escalares são estacionárias e criam um campo de "Ponto Zero" (Vácuo Quântico).
               </p>
               <div className="bg-black/30 p-4 rounded-xl border border-slate-800 mb-4">
                   <h4 className="text-cyan-400 text-xs font-bold uppercase mb-2">Efeito no App:</h4>
                   <p className="text-slate-400 text-xs">
                       O modo escalar cria dois sinais idênticos mas opostos (-180º de fase) em cada canal do fone de ouvido. Isso cancela o som "físico" para o cérebro, mas a <strong>informação energética</strong> permanece pura, indo direto ao subconsciente sem resistência.
                   </p>
               </div>
           </div>
        </div>
      )}

      {/* REACTOR HELP MODAL */}
      {showReactorHelp && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReactorHelp(false)}>
           <div className="bg-slate-900 border border-orange-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(249,115,22,0.1)] relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setShowReactorHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
               <h3 className="text-xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
                   O Reator
               </h3>
               <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Núcleo de Fusão</p>
               <div className="space-y-4">
                   <p className="text-slate-300 text-sm leading-relaxed">
                       O Reator é o motor central do Ressaurea. É um pilar de força vibracional que sustenta todas as outras frequências.
                   </p>
                   <div className="grid grid-cols-2 gap-3">
                       <div className="bg-black/30 p-3 rounded-lg border border-slate-800">
                           <span className="text-orange-500 font-bold block mb-1">Nível Supremo</span>
                           <p className="text-[10px] text-slate-400">A base mais potente de todo o sistema. Use com moderação.</p>
                       </div>
                       <div className="bg-black/30 p-3 rounded-lg border border-slate-800">
                           <span className="text-orange-500 font-bold block mb-1">Fusão Gamma</span>
                           <p className="text-[10px] text-slate-400">Sincroniza os hemisférios cerebrais para processamento máximo.</p>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* MENU MODAL */}
      {showMenu && (
        <div className="fixed inset-0 z-[70] bg-[#020617] animate-fade-in-up">
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-orbitron font-bold text-white">Configurações</h2>
                    <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* DOWNLOAD SETTINGS */}
                    <section>
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FolderOpen size={16} /> Downloads
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1">
                            <button 
                                onClick={() => changeDownloadMode('auto')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${downloadMode === 'auto' ? 'bg-slate-800 border border-cyan-500/30' : 'hover:bg-slate-800/50 border border-transparent'}`}
                            >
                                <div className="text-left">
                                    <span className={`block font-bold text-sm mb-1 ${downloadMode === 'auto' ? 'text-white' : 'text-slate-400'}`}>Automático (Padrão)</span>
                                    <span className="text-xs text-slate-500">Salva na pasta Downloads do navegador.</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${downloadMode === 'auto' ? 'border-cyan-500' : 'border-slate-600'}`}>
                                    {downloadMode === 'auto' && <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>}
                                </div>
                            </button>

                            <div className="h-px bg-slate-800 mx-4"></div>

                            <button 
                                onClick={() => changeDownloadMode('ask')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${downloadMode === 'ask' ? 'bg-slate-800 border border-cyan-500/30' : 'hover:bg-slate-800/50 border border-transparent'}`}
                            >
                                <div className="text-left">
                                    <span className={`block font-bold text-sm mb-1 ${downloadMode === 'ask' ? 'text-white' : 'text-slate-400'}`}>Escolher Pasta (Manual)</span>
                                    <span className="text-xs text-slate-500">Pergunta onde salvar a cada arquivo.</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${downloadMode === 'ask' ? 'border-cyan-500' : 'border-slate-600'}`}>
                                    {downloadMode === 'ask' && <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>}
                                </div>
                            </button>
                        </div>
                    </section>

                     {/* DATA MANAGEMENT */}
                     <section>
                        <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Trash2 size={16} /> Zona de Perigo
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="block font-bold text-slate-300 text-sm">Limpar Histórico Recente</span>
                                    <span className="text-xs text-slate-500">Remove a lista de reprodução recente.</span>
                                </div>
                                <button 
                                   onClick={() => { clearRecents(); setShowSuccessMsg(true); setTimeout(() => setShowSuccessMsg(false), 2000); }}
                                   className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Limpar
                                </button>
                            </div>
                            
                            <div className="h-px bg-slate-800 mb-4"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="block font-bold text-red-300 text-sm">Resetar App</span>
                                    <span className="text-xs text-slate-500">Apaga favoritos, gerados e configurações.</span>
                                </div>
                                <button 
                                   onClick={() => { localStorage.clear(); window.location.reload(); }}
                                   className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 text-xs font-bold rounded-lg transition-colors"
                                >
                                    Resetar Tudo
                                </button>
                            </div>
                        </div>
                     </section>
                     
                     <div className="pt-8 text-center">
                         <p className="text-[10px] text-slate-600 uppercase tracking-widest">Ressaurea v2.0 (Quantum Core)</p>
                     </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
