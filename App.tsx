import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Volume2, 
  Volume1,
  Circle,
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
  CheckCircle,
  Cloud,
  Check,
  MousePointerClick,
  Disc,
  Shield,
  History,
  Eraser,
  Clock,
  RefreshCw,
  Filter,
  Signal,
  ListPlus,
  ListMusic,
  FolderPlus,
  ArrowLeft,
  MoreVertical,
  Plus,
  Square,
  Sparkles,
  Eye,
  EyeOff,
  Database,
  Zap,
  ChevronDown,
  ChevronUp,
  Star,
  Info,
  AlertCircle,
  Unlock
} from 'lucide-react';
import { PRESET_FREQUENCIES, CATEGORIES, GUARDIAN_FREQUENCY, REACTOR_FREQUENCY, REACTOR_MODES, UPLIFT_FREQUENCY } from './constants';
import { Frequency, FrequencyCategory, Playlist } from './types';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { generateFrequenciesFromIntent } from './services/geminiService';

// Fallback MP4 for iOS/Universal - Minimal Silent Video
const WAKE_LOCK_MP4 = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAH21kYXQAAAKAAkCPDwAAAzFhdmMxNFwyAAAAAAAAH21vb3YAAABsbXZoAAAAA+gXEgPoFxIAAAACAAABAAAAAAEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAABBpb2RzAAAAABQAAAABgAAAAQAAAAAAAAAAAAAAAQAAABx0cmFrAAAAXHRraGQAAAAD6BcSA+gXEgAAAAEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAmdwZGwAAAAUelJsZwAAAAEAAAAAAAEAAAABAAAAAA4AAABwbWRpYQAAACBtZGhkAAAAA+gXEgPoFxIAAAACAAABAAAAAAEAAAAAAAAAAAAAAQ==";

// Reverted to Complex/Powerful Words as requested
const SUBLIMINAL_WORDS = ["RESSONÂNCIA", "PODER", "LUZ", "ABSORVER", "FUSÃO", "INFINITO", "CURA", "VIBRAÇÃO", "MUDANÇA", "AGORA"];

const App: React.FC = () => {
  const [activeFrequencies, setActiveFrequencies] = useState<string[]>([]);
  const [activeCount, setActiveCount] = useState(0); 
  const [isScalarMode, setIsScalarMode] = useState(false); 
  const [visualModeScalar, setVisualModeScalar] = useState(true);
  const [visualModeReactor, setVisualModeReactor] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState(''); 
  const [searchMode, setSearchMode] = useState<'INTENT' | 'MATRIX'>('INTENT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFrequencies, setGeneratedFrequencies] = useState<Frequency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [hasStarted, setHasStarted] = useState(false);
  
  const [guardianActive, setGuardianActive] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const [recentFrequencies, setRecentFrequencies] = useState<string[]>([]); 

  const [isPlaying, setIsPlaying] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isAudible, setIsAudible] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null); 
  const [deletingId, setDeletingId] = useState<string | null>(null); 
  
  const [deletedFreqIds, setDeletedFreqIds] = useState<string[]>([]);

  const [showMenu, setShowMenu] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'auto' | 'ask'>('ask');

  const [selectedReactorMode, setSelectedReactorMode] = useState(REACTOR_MODES[0]);
  const [showReactorUI, setShowReactorUI] = useState(true); 
  
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [networkMsg, setNetworkMsg] = useState<{show: boolean, msg: string, type: 'success' | 'warning'}>({show: false, msg: '', type: 'success'});
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [conflictingIds, setConflictingIds] = useState<string[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);

  const [guardianEnabledByUser, setGuardianEnabledByUser] = useState(true);

  const [showSigns, setShowSigns] = useState(false);
  const [showScalarHelp, setShowScalarHelp] = useState(false);
  const [showReactorHelp, setShowReactorHelp] = useState(false);
  const [showGeneratorHelp, setShowGeneratorHelp] = useState(false);

  // Subliminal Reactor State
  const [subliminalWord, setSubliminalWord] = useState("");

  const listTopRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0); 
  
  const longPressTimerRef = useRef<any>(null);

  // Subliminal Word Interval
  useEffect(() => {
    let interval: any;
    if (showReactorUI === false && visualModeReactor && hasStarted && activeFrequencies.includes(REACTOR_FREQUENCY.id)) {
        interval = setInterval(() => {
            const word = SUBLIMINAL_WORDS[Math.floor(Math.random() * SUBLIMINAL_WORDS.length)];
            setSubliminalWord(word);
            setTimeout(() => setSubliminalWord(""), 200); // Flash duration
        }, 3000); // Frequency of flash
    } else {
        setSubliminalWord("");
    }
    return () => clearInterval(interval);
  }, [showReactorUI, visualModeReactor, hasStarted, activeFrequencies]);


  useEffect(() => {
    const savedFavs = localStorage.getItem('quantum_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedPlaylists = localStorage.getItem('quantum_playlists_v2');
    if (savedPlaylists) {
        setPlaylists(JSON.parse(savedPlaylists));
    } else {
        const oldPlaylist = localStorage.getItem('quantum_playlist');
        if (oldPlaylist) {
            const items = JSON.parse(oldPlaylist);
            if (items.length > 0) {
                const legacyPlaylist: Playlist = {
                    id: 'legacy_playlist',
                    name: 'Minha Playlist',
                    createdAt: Date.now(),
                    items: items
                };
                setPlaylists([legacyPlaylist]);
                localStorage.setItem('quantum_playlists_v2', JSON.stringify([legacyPlaylist]));
            }
        }
    }

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
    
    const savedVisualScalar = localStorage.getItem('visual_mode_scalar');
    if (savedVisualScalar !== null) setVisualModeScalar(savedVisualScalar === 'true');
    const savedVisualReactor = localStorage.getItem('visual_mode_reactor');
    if (savedVisualReactor !== null) setVisualModeReactor(savedVisualReactor === 'true');

    audioEngine.setCallback((enginePlaying) => {
      setIsPlaying(enginePlaying);
    });

    const handleOnline = () => {
        setIsOffline(false);
        setNetworkMsg({ show: true, msg: 'Conexão Restaurada', type: 'success' });
        setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 4000);
    };
    
    const handleOffline = () => {
        setIsOffline(true);
        setNetworkMsg({ show: true, msg: 'Sem Conexão (Offline)', type: 'warning' });
        setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync active count state
  useEffect(() => {
    let count = activeFrequencies.filter(id => id !== REACTOR_FREQUENCY.id && id !== GUARDIAN_FREQUENCY.id && id !== UPLIFT_FREQUENCY.id).length;
    if (guardianActive) count += 1;
    setActiveCount(count);
  }, [activeFrequencies, guardianActive]);

  // REACTOR now depends on Global Play State. If paused, Reactor is visually OFF.
  const isReactorActive = activeFrequencies.includes(REACTOR_FREQUENCY.id) && isPlaying;
  const isGuardianVisuallyActive = guardianEnabledByUser && !activeFrequencies.includes(REACTOR_FREQUENCY.id);

  useEffect(() => {
    if (isReactorActive && visualModeReactor) {
        if (videoRef.current) {
            videoRef.current.play().catch(e => {
                console.debug("Video wake lock play inhibited");
            });
        }
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen')
                .then((lock: any) => { wakeLockRef.current = lock; })
                .catch((e: any) => console.log('WakeLock API failed'));
        }
        
        setShowReactorUI(true); // Auto show on entry
        const timer = setTimeout(() => setShowReactorUI(false), 3000); // Auto hide after 3s
        return () => clearTimeout(timer);

    } else {
        if (videoRef.current) {
            try { videoRef.current.pause(); } catch(e) {}
        }
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }
        setShowReactorUI(false); 
    }
  }, [isReactorActive, visualModeReactor]);

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
    if (cat !== 'PLAYLIST') setActivePlaylistId(null);
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
      if (newRecents.length > 50) newRecents = newRecents.slice(0, 50); 
      
      setRecentFrequencies(newRecents);
      localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
  };

  const removeFromRecents = (idToRemove: string) => {
      setDeletingId(idToRemove);
      setTimeout(() => {
          const newRecents = recentFrequencies.filter(id => id !== idToRemove);
          setRecentFrequencies(newRecents);
          localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
          setSingleDeleteId(null);
          setShowDeleteConfirm(false);
          setDeletingId(null);
      }, 500); 
  };
  
  const savePlaylists = (newPlaylists: Playlist[]) => {
      setPlaylists(newPlaylists);
      localStorage.setItem('quantum_playlists_v2', JSON.stringify(newPlaylists));
  };

  const createPlaylist = () => {
      if (!newPlaylistName.trim()) return;
      
      const newPlaylist: Playlist = {
          id: `pl_${Date.now()}`,
          name: newPlaylistName,
          createdAt: Date.now(),
          items: Array.from(selectedItems)
      };
      
      savePlaylists([...playlists, newPlaylist]);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      setShowAddPlaylistModal(false);
      
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setNetworkMsg({ show: true, msg: 'Playlist Criada', type: 'success' });
      setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 3000);
  };

  const addToExistingPlaylist = (playlistId: string) => {
      const updatedPlaylists = playlists.map(pl => {
          if (pl.id === playlistId) {
              const newItems = Array.from(selectedItems).filter(id => !pl.items.includes(id));
              return { ...pl, items: [...pl.items, ...newItems] };
          }
          return pl;
      });
      savePlaylists(updatedPlaylists);
      setShowAddPlaylistModal(false);
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setNetworkMsg({ show: true, msg: 'Adicionado à Playlist', type: 'success' });
      setTimeout(() => setNetworkMsg(prev => ({...prev, show: false})), 3000);
  };

  const deletePlaylist = (playlistId: string) => {
      const updated = playlists.filter(pl => pl.id !== playlistId);
      savePlaylists(updated);
      setShowDeleteConfirm(false);
      setSingleDeleteId(null);
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
      setDeletingId(trackId);
      setTimeout(() => {
          const updated = playlists.map(pl => {
              if (pl.id === playlistId) {
                  return { ...pl, items: pl.items.filter(id => id !== trackId) };
              }
              return pl;
          });
          savePlaylists(updated);
          setSingleDeleteId(null);
          setShowDeleteConfirm(false);
          setDeletingId(null);
      }, 500);
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
      setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
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
      // 1. Close Modal Immediately
      setShowDeleteConfirm(false);
      setSingleDeleteId(null); 

      // 2. Trigger Animation (only if singular for now, or could trigger all)
      if (idsToDelete.length === 1) setDeletingId(idsToDelete[0]);

      const finalizeDelete = () => {
          if (selectedCategory === 'RECENTES') {
            const newRecents = recentFrequencies.filter(id => !idsToDelete.includes(id));
            setRecentFrequencies(newRecents);
            localStorage.setItem('quantum_recents', JSON.stringify(newRecents));
            
            setSelectedItems(new Set());
            if (selectedItems.size === 0) setIsSelectionMode(false);
            setDeletingId(null);
            return;
        }
        
        if (selectedCategory === 'PLAYLIST' && activePlaylistId) {
             const updated = playlists.map(pl => {
                if (pl.id === activePlaylistId) {
                    return { ...pl, items: pl.items.filter(id => !idsToDelete.includes(id)) };
                }
                return pl;
             });
             savePlaylists(updated);
             setDeletingId(null);
             return;
        }

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
        setDeletingId(null);
        
        if (newSelection.size === 0) setIsSelectionMode(false);
      };

      if (idsToDelete.length === 1) {
          setTimeout(finalizeDelete, 500); 
      } else {
          finalizeDelete();
      }
  };

  const handleDeleteSelected = () => {
      if (singleDeleteId) {
          if (selectedCategory === 'PLAYLIST' && !activePlaylistId) {
             deletePlaylist(singleDeleteId);
          } else if (selectedCategory === 'PLAYLIST' && activePlaylistId) {
             removeFromPlaylist(activePlaylistId, singleDeleteId);
          } else if (selectedCategory === 'RECENTES') {
             removeFromRecents(singleDeleteId);
          } else {
             performDelete([singleDeleteId]);
          }
      } else if (selectedItems.size > 0) {
          performDelete(Array.from(selectedItems));
      }
  };
  
  const handleFactoryReset = () => {
      if (window.confirm("ATENÇÃO: Isso apagará todos os seus favoritos, playlist, histórico, frequências geradas e configurações. O app voltará ao estado original. Continuar?")) {
          localStorage.clear();
          window.location.reload();
      }
  };
  
  const startLongPress = (id: string) => {
      longPressTimerRef.current = setTimeout(() => {
          if (isSelectionMode) {
            // TOGGLE OFF: If already in selection mode, exit selection mode completely
            setIsSelectionMode(false);
            setSelectedItems(new Set());
          } else {
            // TOGGLE ON: Start selection mode
            setIsSelectionMode(true);
            setSelectedItems(prev => {
                const newSet = new Set(prev);
                newSet.add(id);
                return newSet;
            });
          }
          if (navigator.vibrate) navigator.vibrate(50);
      }, 400); 
  };

  const endLongPress = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

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
      } else if (selectedCategory === 'PLAYLIST') {
          if (activePlaylistId) {
              const pl = playlists.find(p => p.id === activePlaylistId);
              if (pl) {
                  result = pl.items
                    .map(id => visibleFrequencies.find(f => f.id === id))
                    .filter(Boolean) as Frequency[];
              } else {
                  result = [];
              }
          } else {
              result = []; 
          }
      } else if (selectedCategory === 'RECENTES') {
          result = recentFrequencies
              .map(id => visibleFrequencies.find(f => f.id === id))
              .filter(Boolean) as Frequency[];
      } else if (selectedCategory === 'ATIVOS') {
          result = visibleFrequencies.filter(f => activeFrequencies.includes(f.id));
      } else {
          result = visibleFrequencies.filter(f => f.category === selectedCategory);
      }

      // Filter out CUSTOM category from the main category lists unless explicitly selected or in searches
      if (selectedCategory !== FrequencyCategory.CUSTOM && selectedCategory !== 'ATIVOS' && selectedCategory !== 'RECENTES') {
          result = result.filter(f => f.category !== FrequencyCategory.CUSTOM);
      }

      return result.filter(f => {
          if (!filterTerm) return true;
          const search = filterTerm.toLowerCase();
          return f.name.toLowerCase().includes(search) || f.description.toLowerCase().includes(search);
      });
  }, [allFrequencies, deletedFreqIds, selectedCategory, favorites, playlists, activePlaylistId, recentFrequencies, activeFrequencies, filterTerm]);

  const isAllVisibleSelected = useMemo(() => {
    if (filteredFrequencies.length === 0) return false;
    return filteredFrequencies.every(f => selectedItems.has(f.id));
  }, [filteredFrequencies, selectedItems]);

  const handleSelectAll = () => {
    const visibleIds = filteredFrequencies.map(f => f.id);
    if (isAllVisibleSelected) {
      const newSet = new Set(selectedItems);
      visibleIds.forEach(id => newSet.delete(id));
      setSelectedItems(newSet);
    } else {
      const newSet = new Set(selectedItems);
      visibleIds.forEach(id => newSet.add(id));
      setSelectedItems(newSet);
    }
  };

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

  useEffect(() => {
    if (activeFrequencies.length < 2) {
        setConflictingIds([]);
        setDismissedWarnings([]); 
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
        setDismissedWarnings([]); 
    }
  }, [activeFrequencies, allFrequencies]);

  const handleEnterApp = () => {
    audioEngine.init();
    audioEngine.enableBackgroundMode();
    setHasStarted(true);
  };

  const handleBackToStart = () => {
    setHasStarted(false);
    setShowMenu(false);
  };

  const togglePlayPauseGlobal = async () => {
    if (activeFrequencies.length === 0) return; 
    if (isPlaying) {
        await audioEngine.pauseGlobal();
    } else {
        await audioEngine.resumeGlobal();
    }
  };

  const handleStopAll = async () => {
    await audioEngine.stopAll();
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

  const toggleVisualScalar = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newState = !visualModeScalar;
      setVisualModeScalar(newState);
      localStorage.setItem('visual_mode_scalar', String(newState));
  };

  const toggleVisualReactor = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newState = !visualModeReactor;
      setVisualModeReactor(newState);
      localStorage.setItem('visual_mode_reactor', String(newState));
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
      // Ensure this captures touches anywhere on screen
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 400; // Increased tolerance to 400ms
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          setShowReactorUI(prev => !prev);
      }
      lastTapRef.current = now;
  };
  
  const handleDoubleClick = () => {
      setShowReactorUI(prev => !prev);
  }

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
        addToRecents(newFrequencies[0].id); 
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
  };

  const getActiveHzStats = () => {
      if (activeFrequencies.length === 0) return { avg: 0, breath: '6s', speed: 0.1 };
      let total = 0;
      let count = 0;
      activeFrequencies.forEach(id => {
          const f = allFrequencies.find(freq => freq.id === id);
          if (f) {
              total += f.hz;
              count++;
          }
      });
      // Reactor always boosts energy
      if (activeFrequencies.includes(REACTOR_FREQUENCY.id)) {
          total += 40; 
          count++;
      }
      if (count === 0) return { avg: 0, breath: '6s', speed: 0.1 };
      
      const avg = total / count;
      
      // Determine Speed based on Hz
      let speed = 0.25; // Default Golden Ratio
      let breath = '6s';

      if (avg < 5) { 
        // Delta/Theta
        speed = 0.1; 
        breath = '8s'; 
      } else if (avg > 30) {
        // Gamma/Hyper
        speed = 0.8;
        breath = '3s';
      } else {
        // Alpha/Beta
        speed = 0.4;
        breath = '5s';
      }

      return { avg, breath, speed };
  };

  const stats = getActiveHzStats();
  
  // UNLINKED VISUALIZER SETTINGS
  // Welcome Screen: Fixed 0.2 speed, 6s breath (ASMR)
  // In-App: DYNAMIC based on stats.speed and stats.breath
  const effectiveSpeed = hasStarted ? (activeFrequencies.length > 0 ? stats.speed : 0.25) : 0.2; 
  const effectiveBreath = hasStarted ? (activeFrequencies.length > 0 ? stats.breath : '6s') : '6s';
  const effectiveActive = true; 

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

  const isAtivosHighlighted = activeCount > 0;
  const isAtivosSelected = selectedCategory === 'ATIVOS';
  const isUnifiedView = ['PLAYLIST', 'FAVORITES', 'RECENTES', 'ATIVOS'].includes(selectedCategory);

  return (
    <div className="min-h-screen bg-transparent text-slate-200 selection:bg-cyan-500/30 relative overflow-x-hidden font-rajdhani antialiased w-full h-full">
      
      {isReactorActive && visualModeReactor && (
        <video 
           ref={videoRef}
           loop 
           muted 
           playsInline 
           className="fixed w-1 h-1 -z-10 opacity-0 pointer-events-none top-0 left-0"
           autoPlay
           src={WAKE_LOCK_MP4}
           onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}

      {!hasStarted ? (
        /* --- WELCOME SCREEN OVERLAY + INDEPENDENT VISUALIZER --- */
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
            {/* Visualizer 1: Welcome Screen Only - Top Position - ASMR TUNED */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-60 overflow-hidden touch-none transform-gpu bg-transparent h-screen flex items-start pt-8 justify-center">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.02),transparent_60%)]"></div>
                 <Visualizer 
                    isActive={true} 
                    forceAnimate={true} 
                    speedMultiplier={0.2} // ASMR Slow (Fixed for Welcome)
                    breathDuration={'6s'} // Coherence Breathing
                 />
            </div>

             <div className="relative z-10 flex flex-col items-center w-full max-w-md animate-fade-in-up justify-center h-full px-4 gap-8">
                
                {/* Logo & Title Area - Pushed DOWN because Mandala is at TOP */}
                <div className="flex flex-col items-center gap-1 transform-gpu mt-[45vh]">
                    <h1 className="text-5xl md:text-6xl font-orbitron font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-100 glow-text-cyan drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                    RESSAUREA
                    </h1>
                </div>

                {/* Info Card */}
                <div className="bg-slate-900/90 border border-cyan-500/30 px-6 py-5 rounded-xl max-w-sm w-full backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.08)] text-center transform-gpu">
                    <div className="flex items-center justify-center gap-2 text-cyan-400 font-extrabold tracking-[0.2em] text-xs uppercase mb-3">
                        <ShieldCheck className="w-4 h-4" />
                        <span>BLINDAGEM VIBRACIONAL</span>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-xl text-white font-rajdhani font-extrabold drop-shadow-md">
                            Acesse o <span className="text-cyan-300 glow-text-cyan">Campo de Potencial Infinito</span>.
                        </p>
                        <p className="text-sm text-slate-200 font-medium tracking-wide leading-relaxed opacity-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            Ao ativar a ressonância, uma cúpula de harmonização envolverá seu campo, garantindo paz e segurança total.
                        </p>
                    </div>
                </div>

                {/* Enter Button */}
                <button
                  onClick={handleEnterApp}
                  className="group relative px-12 py-3 bg-transparent overflow-hidden rounded-full transition-all duration-500 hover:scale-105 transform-gpu touch-manipulation"
                >
                  <div className="absolute inset-0 border border-cyan-500/30 rounded-full"></div>
                  <div className="absolute inset-0 bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
                  <div className="relative flex items-center gap-3 text-cyan-100 font-orbitron tracking-widest text-base">
                    <span>ENTRAR</span>
                  </div>
                </button>
            </div>
        </div>
      ) : (
        /* --- MAIN APP CONTENT + INDEPENDENT VISUALIZER --- */
        <>
            {/* Visualizer 2: Main App Only - Center Position - DYNAMIC/REACTIVE */}
            <div className="fixed inset-0 z-[0] pointer-events-none opacity-60 overflow-hidden touch-none transform-gpu bg-transparent h-screen flex items-center justify-center">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.02),transparent_60%)]"></div>
                 <Visualizer 
                    isActive={true} 
                    forceAnimate={true} 
                    speedMultiplier={effectiveSpeed} // REACTIVE SPEED
                    breathDuration={effectiveBreath} // REACTIVE BREATH
                 />
            </div>

            {/* ... Reactor UI ... */}
            {isReactorActive && visualModeReactor && (
                <div 
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden transform-gpu group select-none transition-colors duration-500 bg-black"
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={handleDoubleClick}
                    onClick={handleTouchEnd} // Catch-all for click/tap
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ touchAction: 'none' }}
                >
                    <div 
                        className={`absolute inset-0 bg-white ${selectedReactorMode.id === 'sleep_core' ? 'animate-pulse' : 'animate-pulse'}`} 
                        style={{ 
                            animationDuration: getReactorStrobeDuration(), 
                            opacity: selectedReactorMode.id === 'sleep_core' ? 0.05 : 0.05, // Lowered opacity for PEACE
                            pointerEvents: 'none'
                        }}
                    ></div>
                    {/* Removed Gradient Background to be fully transparent/black */}
                    
                    <div className="relative z-10 flex flex-col items-center scale-150 pointer-events-none">
                        {/* Slowed down Reactor for ASMR/Peace sensation */}
                        <Visualizer isActive={true} speedMultiplier={0.5} breathDuration={'4s'} />
                    </div>

                    {/* SUBLIMINAL LAYER WITH RESONANCE VISUALS */}
                    {subliminalWord && (
                         <div className="absolute inset-0 flex items-center justify-center z-[205] pointer-events-none">
                             {/* FOCUS RING ANIMATION: Exploit focus to induce resonance */}
                             <div className="absolute w-[300px] h-[300px] border border-white/20 rounded-full animate-ping opacity-50"></div>
                             <div className="absolute w-[500px] h-[500px] border border-white/10 rounded-full animate-ping opacity-30" style={{ animationDelay: '0.1s' }}></div>
                             
                             {/* Central Light Pulse */}
                             <div className="absolute w-[200px] h-[200px] bg-white/5 rounded-full blur-3xl animate-pulse"></div>

                             <h2 className="text-6xl md:text-9xl font-orbitron font-black text-white/10 uppercase tracking-tighter animate-ping relative z-10" style={{ animationDuration: '0.2s' }}>
                                 {subliminalWord}
                             </h2>
                         </div>
                    )}

                    <div 
                        className={`absolute inset-0 z-[201] flex flex-col items-center justify-between pb-16 pt-8 transition-opacity duration-500 ${showReactorUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        onTouchEnd={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                         {/* TOP HINT */}
                        <div className="w-full flex justify-center">
                             <p className="text-[10px] text-white/30 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">Toque 2x na tela para opções</p>
                        </div>

                        <div className="flex flex-col items-center">
                            <h2 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 mb-2 drop-shadow-lg">
                                FUSÃO REATOR
                            </h2>
                            <div className="px-6 w-full max-w-[90vw] md:max-w-md text-center">
                                <p className="text-violet-200/60 text-sm tracking-[0.2em] font-light uppercase mb-8 break-words leading-relaxed">
                                    {selectedReactorMode.description}
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        audioEngine.stopFrequency(REACTOR_FREQUENCY.id);
                                        setActiveFrequencies(prev => prev.filter(id => id !== REACTOR_FREQUENCY.id));
                                        setShowReactorUI(false);
                                    }}
                                    className="group flex items-center gap-3 px-8 py-3 rounded-full border border-violet-500/50 bg-violet-900/30 hover:bg-violet-900/50 text-violet-200 transition-all backdrop-blur-md shadow-lg shadow-violet-900/20 touch-manipulation"
                                >
                                    <Power className="w-5 h-5" />
                                    <span className="font-bold tracking-widest text-xs">PARAR FUSÃO</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="fixed top-0 left-0 right-0 z-[60] bg-[#020617]/95 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-4 md:px-8 justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowMenu(true)} className="p-2 text-slate-400 hover:text-white transition-colors touch-manipulation">
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-orbitron font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-cyan-200">
                    RESSAUREA
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                    onClick={() => setShowSigns(true)}
                    className="p-2 mr-1 text-slate-500 hover:text-cyan-400 transition-colors touch-manipulation"
                    title="Sinais"
                    >
                        <Activity className="w-5 h-5" />
                    </button>

                    <button 
                    onClick={() => setGuardianEnabledByUser(!guardianEnabledByUser)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 touch-manipulation ${
                        isGuardianVisuallyActive 
                        ? 'bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                    }`}
                    >
                    <div className={`relative w-2 h-2 rounded-full transition-all duration-500 ${isGuardianVisuallyActive ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-600'}`}>
                        {isGuardianVisuallyActive && <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400 opacity-75"></div>}
                    </div>
                    
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isGuardianVisuallyActive ? 'text-cyan-100' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {isGuardianVisuallyActive ? 'Protegido' : 'Inativo'}
                    </span>
                    
                    {isGuardianVisuallyActive && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
                    </button>
                </div>
            </header>

            <div className="fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-xl border-t border-cyan-500/10 h-16 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex items-center">
                <div className="w-full px-8 flex items-center justify-between">
                    <button 
                    onClick={toggleAudibleMode}
                    className="flex flex-col items-center justify-center gap-0.5 group w-16 flex-shrink-0 touch-manipulation"
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
                        className="w-14 h-14 flex items-center justify-center rounded-full text-slate-500 hover:text-red-400 transition-all bg-[#0f172a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_black] border border-slate-800 hover:border-red-900/50 active:scale-95 flex-shrink-0 touch-manipulation"
                        title="Parar Tudo"
                        >
                            <Square className="w-5 h-5 fill-current" />
                        </button>
                        
                        <button 
                        onClick={togglePlayPauseGlobal}
                        className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0 touch-manipulation shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_black] ${isPlaying && activeFrequencies.length > 0 ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-400' : 'bg-[#0f172a] border border-slate-700 text-slate-500 hover:text-slate-300'}`}
                        >
                            {isPlaying && activeFrequencies.length > 0 && <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-md"></div>}
                            <div className="relative z-10 drop-shadow-md flex items-center justify-center translate-x-[2px]">
                                {isPlaying && activeFrequencies.length > 0 ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current" />}
                            </div>
                        </button>
                    </div>

                    <button 
                    onClick={() => setShowPlaylistMenu(true)}
                    className={`flex flex-col items-center justify-center gap-0.5 group w-16 flex-shrink-0 touch-manipulation ${selectedCategory === 'PLAYLIST' || showPlaylistMenu ? 'text-cyan-400' : 'text-slate-500'}`}
                    >
                        <div className={`p-1.5 transition-all duration-300 ${selectedCategory === 'PLAYLIST' || showPlaylistMenu ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-300'}`}>
                        <ListMusic className="w-5 h-5" />
                        </div>
                        <span className={`text-[9px] uppercase tracking-widest font-semibold transition-colors whitespace-nowrap ${selectedCategory === 'PLAYLIST' || showPlaylistMenu ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-300'}`}>Playlist</span>
                    </button>
                </div>
            </div>

            <div className="animate-fade-in-slow relative z-10">
                <main className="pt-16 pb-20 h-full w-full touch-pan-y">
                
                {/* ... (Main Content: Scalar/Reactor Cards, Search Bar) ... */}
                <div className="w-full px-4 md:px-8 pt-6 pb-2 space-y-4 relative z-20">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SCALAR MODE CARD */}
                        <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-cyan-500/20 shadow-lg p-5 flex items-center justify-between backdrop-blur-sm transition-all hover:bg-slate-900/60">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${isScalarMode ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-600'}`}>
                                    <Infinity className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200 tracking-wide">Modo Escalar</div>
                                    <div className="text-[10px] text-cyan-500/60 font-medium tracking-wider">ZERO POINT</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={toggleVisualScalar}
                                    className={`p-2 transition-all touch-manipulation ${visualModeScalar ? 'text-cyan-400' : 'text-slate-600 hover:text-cyan-400'}`}
                                >
                                    {visualModeScalar ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                                <button 
                                    onClick={toggleScalarMode}
                                    className={`w-12 h-7 rounded-full transition-colors relative touch-manipulation border ${isScalarMode ? 'bg-cyan-900/40 border-cyan-500/50' : 'bg-slate-900/50 border-slate-700'}`}>
                                    <div className={`absolute top-1 bottom-1 w-5 h-5 rounded-full transition-all duration-300 shadow-sm ${isScalarMode ? 'translate-x-6 bg-cyan-400 shadow-[0_0_8px_cyan]' : 'translate-x-1 bg-slate-500'}`}></div>
                                </button>
                            </div>
                            <button onClick={() => setShowScalarHelp(true)} className="absolute top-4 right-4 text-cyan-500/50 hover:text-cyan-400 p-1"><HelpCircle className="w-5 h-5"/></button>
                        </div>

                        {/* REACTOR MODE CARD - ELEGANT VIOLET/COSMIC GLASS */}
                        <div className="relative overflow-hidden rounded-2xl bg-[#050014] border border-violet-900/40 shadow-[0_0_20px_rgba(139,92,246,0.1)] p-5 flex items-center justify-between backdrop-blur-sm transition-all hover:bg-violet-950/20">
                            {/* Inner Glow subtle */}
                            <div className={`absolute inset-0 bg-violet-900/5 pointer-events-none transition-opacity duration-1000 ${isReactorActive ? 'opacity-100' : 'opacity-0'}`}></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-1000 ease-out border ${isReactorActive ? 'bg-violet-950 border-violet-500 text-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-600'}`}>
                                    <Atom className="w-5 h-5" /> 
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200 tracking-wide">O Reator</div>
                                    <div className="text-[10px] text-violet-500/60 font-medium tracking-wider">FUSÃO CÓSMICA</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 relative z-10">
                                <button 
                                    onClick={toggleVisualReactor}
                                    className={`p-2 transition-all touch-manipulation ${visualModeReactor ? 'text-violet-400' : 'text-slate-600 hover:text-violet-400'}`}
                                >
                                    {visualModeReactor ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                                <button 
                                    onClick={() => toggleFrequency(REACTOR_FREQUENCY)}
                                    className={`w-12 h-7 rounded-full transition-colors relative touch-manipulation border ${isReactorActive ? 'bg-violet-950/40 border-violet-500/50' : 'bg-slate-900/50 border-slate-700'}`}>
                                    <div className={`absolute top-1 bottom-1 w-5 h-5 rounded-full transition-all duration-300 shadow-sm ${isReactorActive ? 'translate-x-6 bg-violet-500 shadow-[0_0_8px_violet]' : 'translate-x-1 bg-slate-500'}`}></div>
                                </button>
                            </div>
                            <button onClick={() => setShowReactorHelp(true)} className="absolute top-4 right-4 text-violet-500/50 hover:text-violet-400 p-1"><HelpCircle className="w-5 h-5"/></button>
                        </div>
                    </div>

                    {/* STICKY HEADER for Search & Filter */}
                    <div className="sticky top-16 z-30 pt-2 pb-2 bg-[#020617]/95 backdrop-blur-md -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/5 shadow-md">
                        {/* ... Search Bar ... */}
                        <div className="relative group mb-4">
                            <div className={`absolute inset-0 bg-gradient-to-r rounded-full blur transition-opacity opacity-0 group-hover:opacity-30 ${searchMode === 'MATRIX' ? 'from-emerald-500 to-green-500' : 'from-cyan-500 to-blue-500'}`}></div>
                            <div className={`relative bg-slate-900/90 border rounded-full flex items-center p-1.5 shadow-lg transition-colors ${searchMode === 'MATRIX' ? 'border-emerald-500/30 focus-within:border-emerald-500' : 'border-cyan-500/30 focus-within:border-cyan-500'}`}>
                                
                                <button
                                    onClick={() => setShowGeneratorHelp(true)} 
                                    className="pl-3 pr-2 text-slate-500 hover:text-cyan-400 transition-colors touch-manipulation"
                                >
                                    <Info className="w-4 h-4" />
                                </button>

                                <div className="relative flex-1">
                                    <input 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onFocus={handleInputFocus}
                                        placeholder="Digite para Baixar Frequência (IA)..."
                                        className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-500 py-2 pr-8"
                                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white p-1 touch-manipulation"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pr-1 pl-2">
                                    <button 
                                        onClick={() => handleGenerate()}
                                        disabled={!searchTerm.trim() || isGenerating}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full text-white transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 touch-manipulation ${searchMode === 'MATRIX' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                         {/* ... Search input and bulk actions ... */}
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:max-w-[200px] transition-all duration-300 focus-within:flex-1 sm:focus-within:max-w-[250px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input 
                                            type="text"
                                            value={filterTerm}
                                            onChange={(e) => setFilterTerm(e.target.value)}
                                            onFocus={handleInputFocus}
                                            placeholder="Buscar..."
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full py-2 pl-9 pr-8 text-xs font-bold text-slate-200 outline-none focus:border-cyan-500/30 transition-all placeholder-slate-600 focus:bg-slate-900"
                                        />
                                        {filterTerm && (
                                            <button 
                                                onClick={() => setFilterTerm('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white p-1 touch-manipulation"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    {!isSelectionMode ? (
                                        <button 
                                            onClick={() => {
                                                setIsSelectionMode(true);
                                                setSelectedItems(new Set());
                                            }}
                                            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-700 transition-all whitespace-nowrap flex-shrink-0 touch-manipulation"
                                        >
                                            <ListChecks className="w-4 h-4" /> 
                                            <span className="hidden sm:inline">Selecionar Vários</span>
                                            <span className="sm:hidden">Selecionar</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 animate-fadeIn flex-wrap">
                                            <button
                                                onClick={handleSelectAll}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 text-xs font-bold border border-slate-600 whitespace-nowrap transition-all touch-manipulation"
                                            >
                                                {isAllVisibleSelected 
                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                                                : <Circle className="w-3.5 h-3.5 text-slate-400" />
                                                }
                                                Tudo
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsSelectionMode(false);
                                                    setSelectedItems(new Set());
                                                }}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 rounded-full text-slate-400 text-xs font-bold border border-slate-600 transition-all"
                                            >
                                                Sair
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    {(selectedCategory === 'RECENTES' || (selectedCategory === 'PLAYLIST' && activePlaylistId)) && !isSelectionMode && (
                                            <button 
                                                onClick={() => {
                                                    if (selectedCategory === 'PLAYLIST' && activePlaylistId) {
                                                        deletePlaylist(activePlaylistId);
                                                        setActivePlaylistId(null);
                                                    } else {
                                                        clearRecents();
                                                    }
                                                }}
                                                className="ml-auto flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-red-400 bg-transparent px-2 py-1 transition-all group touch-manipulation"
                                            >
                                                <Eraser className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> 
                                                <span className="hidden sm:inline">
                                                    {selectedCategory === 'RECENTES' ? 'Limpar Histórico' : 'Apagar Playlist'}
                                                </span>
                                            </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full px-4 md:px-8 py-0 z-40 bg-transparent">
                    {/* ... Category Buttons ... */}
                    <div className="flex gap-2.5 overflow-x-auto py-4 px-4 -mx-4 items-center w-[calc(100%+2rem)] no-scrollbar touch-pan-x">
                        {/* ... (Existing Category Buttons) ... */}
                        <button
                            onClick={() => handleCategoryChange('All')}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                selectedCategory === 'All' 
                                ? 'bg-slate-100 text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105 border-transparent' 
                                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            TODOS
                        </button>

                        <button
                            onClick={() => handleCategoryChange('ATIVOS')}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                isAtivosSelected
                                    ? 'bg-slate-900/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105 border-emerald-500/60'
                                    : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                             <Disc className={`w-3.5 h-3.5 text-emerald-400 ${activeCount > 0 ? 'animate-spin-slow' : ''}`} /> 
                             <span>ATIVOS</span>
                             {activeCount > 0 && <span>({activeCount})</span>}
                        </button>
                        
                        <button
                            onClick={() => handleCategoryChange('PLAYLIST')}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                selectedCategory === 'PLAYLIST' 
                                ? 'bg-cyan-900/30 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)] scale-105 border-cyan-500/30' 
                                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <ListMusic className="w-3.5 h-3.5 text-cyan-400" /> PLAYLIST
                        </button>

                        <button
                            onClick={() => handleCategoryChange('RECENTES')}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                selectedCategory === 'RECENTES' 
                                ? 'bg-purple-900/30 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] scale-105 border-purple-500/30' 
                                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <History className="w-3.5 h-3.5 text-purple-400" /> RECENTES
                        </button>

                        <button
                            onClick={() => handleCategoryChange('FAVORITOS')}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center gap-2 hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                selectedCategory === 'FAVORITOS' 
                                ? 'bg-yellow-900/30 text-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.3)] scale-105 border-yellow-500/30' 
                                : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <Star className="w-3.5 h-3.5 text-yellow-400" /> FAVORITOS
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
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-full whitespace-nowrap text-[11px] font-bold tracking-wider transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border flex items-center justify-center hover:scale-105 transform-gpu subpixel-antialiased [backface-visibility:hidden] touch-manipulation ${
                                        isSelected 
                                        ? `bg-gradient-to-r ${theme.gradient} ${textColor} shadow-lg scale-105 ${theme.border || 'border-transparent'}` 
                                        : `bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500`
                                    }`}
                                >
                                    {cat}
                                </button>
                            )
                        })}
                        <div className="pr-4"></div>
                    </div>
                </div>

                <div className="w-full px-4 md:px-8 pt-0 min-h-[100vh]" ref={listTopRef}>
                    
                    {/* ... (Lists Rendering) ... */}
                    {selectedCategory === 'PLAYLIST' && activePlaylistId && (
                        <div className="flex items-center gap-3 mb-4 animate-fade-in-up">
                            <button 
                                onClick={() => setActivePlaylistId(null)}
                                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors touch-manipulation"
                            >
                                <ArrowLeft className="w-4 h-4 text-white" />
                            </button>
                            <h2 className="text-xl font-bold text-blue-200">
                                {playlists.find(p => p.id === activePlaylistId)?.name}
                            </h2>
                        </div>
                    )}
                    
                    {/* ... Playlist Grid & Cards ... */}
                    {selectedCategory === 'PLAYLIST' && !activePlaylistId ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                            <div 
                                onClick={() => {
                                    setIsCreatingPlaylist(true);
                                    setShowAddPlaylistModal(true);
                                }}
                                className="bg-slate-900/30 border border-slate-700 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all cursor-pointer min-h-[140px] touch-manipulation"
                            >
                                <Plus className="w-8 h-8 mb-2" />
                                <span className="text-xs font-bold uppercase tracking-wider">Nova Playlist</span>
                            </div>

                            {playlists.map(playlist => (
                                <div 
                                    key={playlist.id}
                                    onClick={() => setActivePlaylistId(playlist.id)}
                                    className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500/30 transition-all cursor-pointer min-h-[140px] group relative touch-manipulation"
                                >
                                    <div className="absolute top-3 right-3 text-slate-600 group-hover:text-cyan-400">
                                        <MoreVertical className="w-4 h-4" />
                                    </div>
                                    
                                    <div className="w-10 h-10 bg-cyan-900/20 rounded-full flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                                        <FolderOpen className="w-5 h-5 fill-current" />
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-bold text-slate-200 group-hover:text-cyan-200 truncate">{playlist.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{playlist.items.length} Frequências</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <>
                            {isUnifiedView || selectedCategory === 'PLAYLIST' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                                    {filteredFrequencies.map(freq => renderCard(freq))}
                                </div>
                            ) : (
                                <>
                                    {filteredFrequencies.some(f => f.id.startsWith('custom_') || f.id.startsWith('offline_') || f.id.startsWith('sys_')) && (
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3 ml-1">
                                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                                <Cloud className="w-3 h-3" /> Minhas Frequências (Baixadas)
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                                {filteredFrequencies.filter(f => f.id.startsWith('custom_') || f.id.startsWith('offline_') || f.id.startsWith('sys_')).map(freq => renderCard(freq))}
                                            </div>
                                        </div>
                                    )}

                                    {(selectedCategory !== 'All' || filteredFrequencies.some(f => !f.id.startsWith('custom_') && !f.id.startsWith('offline_') && !f.id.startsWith('sys_'))) && (
                                        <>
                                            {selectedCategory === 'All' && (
                                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Biblioteca do App</h3>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                                                {filteredFrequencies.filter(f => !f.id.startsWith('custom_') && !f.id.startsWith('offline_') && !f.id.startsWith('sys_')).map(freq => renderCard(freq))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {selectedCategory === 'PLAYLIST' && !activePlaylistId && playlists.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-500">
                            <p>Você ainda não criou nenhuma playlist.</p>
                        </div>
                    )}

                    {filteredFrequencies.length === 0 && (selectedCategory !== 'PLAYLIST' || activePlaylistId) && (
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
                            ) : selectedCategory === 'PLAYLIST' ? (
                                <>
                                    <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Esta playlist está vazia.<br/><span className="text-xs">Use "Selecionar Vários" para adicionar.</span></p>
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
            </div>
        </>
      )}

      {/* --- MODALS (HIGH Z-INDEX) --- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
           <div className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl max-w-sm w-full text-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
              <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-orbitron">
                 {selectedCategory === 'PLAYLIST' && !activePlaylistId ? 'Apagar Playlist?' : 'Apagar Frequência?'}
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                 {selectedCategory === 'PLAYLIST' && !activePlaylistId 
                    ? 'Esta playlist será excluída permanentemente.'
                    : selectedCategory === 'PLAYLIST' && activePlaylistId
                        ? 'Esta frequência será removida da playlist.'
                        : 'Esta ação não pode ser desfeita e removerá o item da sua lista.'
                 }
              </p>
              <div className="flex gap-3 justify-center">
                 <button 
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setSingleDeleteId(null);
                    }} 
                    className="px-6 py-2 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-bold text-xs tracking-wider"
                 >
                    CANCELAR
                 </button>
                 <button 
                    onClick={handleDeleteSelected} 
                    className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors font-bold text-xs tracking-wider"
                 >
                    APAGAR
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MENU OVERLAY (Z-INDEX 100) --- */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setShowMenu(false)}>
            <div 
                className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#020617] border-r border-cyan-500/20 shadow-[0_0_40px_rgba(0,0,0,0.8)] p-6 animate-slide-in-left flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-orbitron font-bold text-white tracking-widest">MENU</h2>
                    <button onClick={() => setShowMenu(false)} className="p-2 text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                    <button onClick={() => { setShowMenu(false); setSelectedCategory('All'); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-all font-bold tracking-wide flex items-center gap-3">
                        <ListMusic className="w-4 h-4" /> Todas Frequências
                    </button>
                    <button onClick={() => { setShowMenu(false); setSelectedCategory('FAVORITOS'); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-yellow-400 transition-all font-bold tracking-wide flex items-center gap-3">
                        <Star className="w-4 h-4" /> Favoritos
                    </button>
                    <button onClick={() => { setShowMenu(false); setSelectedCategory('RECENTES'); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-purple-400 transition-all font-bold tracking-wide flex items-center gap-3">
                        <History className="w-4 h-4" /> Histórico Recente
                    </button>
                    
                    <div className="border-t border-slate-800 my-4"></div>

                    {/* Settings Accordion */}
                    <div>
                        <button 
                            onClick={() => setShowSettingsSubmenu(!showSettingsSubmenu)}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all font-bold tracking-wide flex items-center justify-between"
                        >
                            <span className="flex items-center gap-3"><Settings className="w-4 h-4" /> Configurações</span>
                            {showSettingsSubmenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {showSettingsSubmenu && (
                            <div className="ml-4 pl-4 border-l border-slate-700 space-y-2 mt-1 animate-fade-in-up">
                                <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 pl-2">Destino Downloads</p>
                                <button 
                                    onClick={() => changeDownloadMode('auto')}
                                    className={`w-full text-left px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${downloadMode === 'auto' ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {downloadMode === 'auto' && <Check className="w-3 h-3" />} Automático
                                </button>
                                <button 
                                    onClick={() => changeDownloadMode('ask')}
                                    className={`w-full text-left px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${downloadMode === 'ask' ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    {downloadMode === 'ask' && <Check className="w-3 h-3" />} Perguntar Sempre
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={handleFactoryReset} className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-900/20 text-slate-300 hover:text-red-400 transition-all font-bold tracking-wide flex items-center gap-3 mt-4">
                        <RefreshCw className="w-4 h-4" /> Resetar App
                    </button>
                </div>
                
                <div className="pt-6 border-t border-slate-800 text-center">
                    <button onClick={handleBackToStart} className="text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2 w-full py-2">
                        <LogOut className="w-3 h-3" /> Tela Inicial
                    </button>
                    <p className="text-[10px] text-slate-600 mt-2">v2.5.0 Quantum Core</p>
                </div>
            </div>
        </div>
      )}

      {/* --- PLAYLIST MENU (Z-INDEX 100) --- */}
      {showPlaylistMenu && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={() => setShowPlaylistMenu(false)}>
            <div 
                className="bg-[#0f172a] border-t border-cyan-500/20 rounded-t-3xl p-6 pb-10 animate-fade-in-up max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ListMusic className="w-5 h-5 text-cyan-400" /> Minhas Playlists
                    </h3>
                    <button onClick={() => setShowPlaylistMenu(false)} className="p-1 bg-slate-800 rounded-full">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                
                <div className="grid gap-3">
                    <button 
                        onClick={() => {
                            if (selectedItems.size > 0) {
                                setIsCreatingPlaylist(true);
                                setShowAddPlaylistModal(true);
                            } else {
                                handleCategoryChange('PLAYLIST');
                                setShowPlaylistMenu(false);
                            }
                        }}
                        className="w-full p-4 bg-slate-800/50 hover:bg-cyan-900/20 border border-slate-700 border-dashed hover:border-cyan-500/50 rounded-xl flex items-center gap-4 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500 text-white transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h4 className="font-bold text-slate-200 group-hover:text-cyan-200">
                                {selectedItems.size > 0 ? 'Criar Nova com Seleção' : 'Gerenciar Playlists'}
                            </h4>
                            <p className="text-xs text-slate-500">
                                {selectedItems.size > 0 ? `${selectedItems.size} itens selecionados` : 'Ver ou criar novas'}
                            </p>
                        </div>
                    </button>

                    {playlists.map(pl => (
                        <button 
                            key={pl.id}
                            onClick={() => {
                                if (selectedItems.size > 0) {
                                    addToExistingPlaylist(pl.id);
                                    setShowPlaylistMenu(false);
                                } else {
                                    handleCategoryChange('PLAYLIST');
                                    setActivePlaylistId(pl.id);
                                    setShowPlaylistMenu(false);
                                }
                            }}
                            className="w-full p-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/30 rounded-xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-cyan-500">
                                    <FolderOpen className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-slate-200">{pl.name}</h4>
                                    <p className="text-xs text-slate-500">{pl.items.length} faixas</p>
                                </div>
                            </div>
                            {selectedItems.size > 0 && <Plus className="w-5 h-5 text-cyan-400" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

       {/* --- PLAYLIST ADD MODAL (Z-INDEX 105) --- */}
       {showAddPlaylistModal && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl max-w-sm w-full shadow-[0_0_40px_rgba(6,182,212,0.1)]">
              <h3 className="text-xl font-bold text-white mb-4">Nova Playlist</h3>
              <input 
                 type="text" 
                 placeholder="Nome da Playlist..." 
                 value={newPlaylistName}
                 onChange={(e) => setNewPlaylistName(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:border-cyan-500 outline-none"
                 autoFocus
              />
              <div className="flex gap-3 justify-end">
                 <button 
                    onClick={() => setShowAddPlaylistModal(false)} 
                    className="px-4 py-2 text-slate-400 hover:text-white"
                 >
                    Cancelar
                 </button>
                 <button 
                    onClick={createPlaylist} 
                    className="px-6 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                 >
                    Criar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- SIGNS MODAL --- */}
      {showSigns && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up" onClick={() => setShowSigns(false)}>
            <div className="bg-slate-900 border border-cyan-500/30 p-6 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> Sinais de Alinhamento
                    </h3>
                    <button onClick={() => setShowSigns(false)}><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Gosto metálico ou "elétrico" na boca.</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Formigamento sutil nos lábios ou topo da cabeça.</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Sensação súbita de calor ou frio na coluna.</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Leve pressão na testa (Terceiro Olho) ou ouvidos.</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Micro-espasmos musculares (liberação de tensão).</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Bocejos profundos (oxigenação celular).</span></li>
                    <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5"/> <span>Mudança na percepção visual (cores mais vivas).</span></li>
                </ul>
            </div>
        </div>
      )}

      {/* ... (Other Help Modals omitted for brevity, logic is same) ... */}

    </div>
  );
  
  function renderCard(freq: Frequency) {
      if (freq.id === GUARDIAN_FREQUENCY.id) return null;

      const isActive = activeFrequencies.includes(freq.id);
      const isConflicting = conflictingIds.includes(freq.id);
      const isDismissed = dismissedWarnings.includes(freq.id); 
      const theme = getCategoryTheme(freq.category);
      const isFav = favorites.includes(freq.id);
      const downloading = isDownloading === freq.id;
      const isSelectedForDelete = selectedItems.has(freq.id);
      const isBeingDeleted = deletingId === freq.id; 
      
      const isGenerated = freq.id.startsWith('custom_') || freq.id.startsWith('offline_');
      const isSystemMsg = freq.id.startsWith('sys_');

      const isAudiblyPlaying = isActive && isPlaying;

      if (isSystemMsg) {
          return (
             <div key={freq.id} className="col-span-full p-6 bg-red-900/20 border border-red-500/50 rounded-xl text-center flex flex-col items-center gap-3">
                 <WifiOff className="w-8 h-8 text-red-400" />
                 <div>
                    <h3 className="text-red-200 font-bold">{freq.name}</h3>
                    <p className="text-red-200/60 text-sm">{freq.description}</p>
                 </div>
             </div>
          );
      }

      return (
          <div 
            key={freq.id}
            id={freq.id}
            onClick={(e) => {
                if (isSelectionMode) {
                    toggleSelection(freq.id);
                    e.stopPropagation();
                }
            }}
            onTouchStart={() => startLongPress(freq.id)}
            onTouchEnd={endLongPress}
            onTouchMove={endLongPress} 
            onMouseDown={() => startLongPress(freq.id)}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
            onContextMenu={(e) => { e.preventDefault(); }}
            className={`relative overflow-hidden rounded-lg border transition-all duration-300 group transform-gpu subpixel-antialiased [backface-visibility:hidden] h-auto min-h-[140px] flex flex-col select-none touch-manipulation will-change-transform active:scale-95 ${
                isBeingDeleted ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
            } ${
                isSelectionMode 
                   ? isSelectedForDelete 
                       ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-[0.98]' 
                       : 'bg-slate-900/40 border-slate-600 hover:border-slate-400 cursor-pointer'
                   : isActive 
                       ? `${theme.bg} ${theme.border} ${theme.shadow}` 
                       : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
            }`}
          >
            {isActive && !isSelectionMode && (
                <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-5`}></div>
            )}
            
            <div className={`absolute top-2 left-3 z-20 ${isActive ? 'opacity-80' : 'opacity-30'}`}>
                 {isGenerated 
                    ? <Cloud className="w-3 h-3 text-cyan-400" />
                    : <Database className="w-3 h-3 text-slate-400" />
                 }
            </div>

            {/* CONFLICT WARNING - Bottom Center */}
            {isConflicting && !isSelectionMode && isActive && !isDismissed && (
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-40 w-full flex justify-center pb-0.5">
                     <div className="bg-amber-900/90 border-t border-x border-amber-500/30 text-amber-200 text-[9px] font-bold px-4 py-0.5 flex items-center gap-1.5 rounded-t-lg backdrop-blur-md shadow-lg">
                         <AlertCircle className="w-3 h-3" />
                         <span>ONDAS OPOSTAS</span>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDismissedWarnings(prev => [...prev, freq.id]);
                            }}
                            className="p-0.5 ml-1 hover:text-white rounded-full transition-colors touch-manipulation bg-amber-900/40"
                         >
                            <X className="w-2.5 h-2.5" />
                         </button>
                     </div>
                 </div>
            )}
            
            {isSelectionMode && (
                <div className="absolute top-3 right-3 z-20 animate-fade-in-up">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelectedForDelete ? 'bg-cyan-500 border-cyan-500 shadow-lg' : 'border-slate-500 bg-transparent'}`}>
                        {isSelectedForDelete && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>
            )}

            <div className={`p-4 flex items-center justify-between relative z-10 ${isSelectionMode ? 'pointer-events-none' : ''} h-full`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFrequency(freq); }}
                      className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-700 shadow-lg border border-white/10 touch-manipulation ${
                          isActive 
                          ? `bg-gradient-to-br ${theme.gradient} text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]` 
                          : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                      }`}
                      disabled={isSelectionMode}
                    >
                        {isActive ? (
                            isAudiblyPlaying ? (
                                <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center shadow-inner">
                                    <Pause className="w-4 h-4 fill-white text-white" />
                                </div>
                            ) : (
                                <Play className="w-5 h-5 fill-current pl-0.5" />
                            )
                        ) : (
                            <Play className="w-5 h-5 fill-current pl-0.5" />
                        )}
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col h-full items-center justify-center pt-2">
                        <div className="flex justify-between items-center w-full gap-2 pr-2 mb-1">
                            <h3 className={`font-rajdhani font-extrabold text-lg leading-tight break-words ${isActive ? 'text-white' : 'text-slate-100'}`}>
                                {freq.name}
                            </h3>
                            <span className={`flex items-center justify-center text-[11px] font-bold px-2 py-0.5 rounded-full border bg-opacity-20 whitespace-nowrap flex-shrink-0 mt-0.5 ml-auto ${isActive ? 'border-white/30 text-white' : 'border-slate-700 text-slate-500'}`}>
                                {freq.hz} Hz
                            </span>
                        </div>
                        <p className={`text-sm leading-relaxed font-medium break-words w-full ${isActive ? 'text-slate-200' : 'text-slate-300'}`}>
                            {freq.description}
                        </p>
                    </div>
                </div>

                <div className={`flex flex-col gap-1.5 ml-3 flex-shrink-0 transition-opacity duration-300 ${isSelectionMode ? 'opacity-0' : 'opacity-100'}`}>
                    <button 
                    onClick={(e) => toggleFavorite(e, freq.id)}
                    className={`p-2.5 rounded-full transition-colors touch-manipulation ${isFav ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                    disabled={isSelectionMode}
                    >
                        <Star className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                    onClick={(e) => handleDownload(e, freq)}
                    className={`p-2.5 rounded-full transition-colors touch-manipulation ${downloading ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-600 hover:text-cyan-400'}`}
                    title="Baixar Áudio"
                    disabled={isSelectionMode}
                    >
                        {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    </button>
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (selectedCategory === 'RECENTES' ? true : (selectedCategory === 'PLAYLIST' && activePlaylistId) ? true : false) {
                                if (selectedCategory === 'RECENTES') removeFromRecents(freq.id);
                                if (selectedCategory === 'PLAYLIST' && activePlaylistId) removeFromPlaylist(activePlaylistId, freq.id);
                            } else {
                                setSingleDeleteId(freq.id); 
                                setShowDeleteConfirm(true); 
                            }
                        }}
                        className="p-2.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors touch-manipulation"
                        title={selectedCategory === 'RECENTES' ? "Remover do Histórico" : selectedCategory === 'PLAYLIST' ? "Remover da Playlist" : "Apagar Frequência"}
                        disabled={isSelectionMode}
                    >
                        {selectedCategory === 'RECENTES' || selectedCategory === 'PLAYLIST' ? <X className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>
          </div>
      );
  }
};

export default App;