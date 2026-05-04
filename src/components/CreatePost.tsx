import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Camera, Smile, Send, Sparkles, MapPin, Music, Type, Wand2 } from 'lucide-react';
import { UserProfile, MusicMetadata } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface CreatePostProps {
  profile: UserProfile;
  onClose: () => void;
}

const FILTERS = [
  { id: 'none', name: 'Original', class: '' },
  { id: 'grayscale', name: 'Neural', class: 'grayscale' },
  { id: 'sepia', name: 'Sepia', class: 'sepia' },
  { id: 'invert', name: 'Void', class: 'invert' },
  { id: 'hue-rotate', name: 'Pulse', class: 'hue-rotate-90' },
  { id: 'saturate', name: 'Overload', class: 'saturate-200' },
];

const FONTS = [
  { id: 'font-sans', name: 'Inter', label: 'Standard' },
  { id: 'font-serif', name: 'Serif', label: 'Classic' },
  { id: 'font-mono', name: 'Mono', label: 'Console' },
  { id: 'font-futuristic', name: 'Futuristic', label: 'Neural' },
];

const FALLBACK_MUSIC: MusicMetadata[] = [
  { id: 'm1', title: 'Night Drive', artist: 'SynthPulse', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'm2', title: 'Cyber City', artist: 'NeonNode', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'm3', title: 'Data Stream', artist: 'BitStream', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'm4', title: 'Neon Dreams', artist: 'VaporLink', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'm5', title: 'Void Runner', artist: 'DeepNeural', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 'm6', title: 'Solar Flare', artist: 'StarNode', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
  { id: 'm7', title: 'Glitch Hop', artist: 'CircuitBreaker', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
  { id: 'm8', title: 'Midnight Protocol', artist: 'ShadowBit', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
];

export default function CreatePost({ profile, onClose }: CreatePostProps) {
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'post' | 'moment'>('post');
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedFont, setSelectedFont] = useState('font-sans');
  const [selectedMusic, setSelectedMusic] = useState<MusicMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'filter' | 'music' | 'font'>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // Global Library State
  const [globalMusic, setGlobalMusic] = useState<MusicMetadata[]>([]);
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', url: '' });

  React.useEffect(() => {
    const fetchMusic = async () => {
      try {
        const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MusicMetadata));
        setGlobalMusic(data);
      } catch (e) {
        console.error("Failed to load global music:", e);
      }
    };
    fetchMusic();
  }, []);

  const handleSpotifySearch = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.error === "CONFIGURATION_REQUIRED") {
        // Fallback: Search local + global library
        const library = [...FALLBACK_MUSIC, ...globalMusic];
        const filtered = library.filter(m => 
          m.title.toLowerCase().includes(query.toLowerCase()) || 
          m.artist.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
        return;
      }

      if (!data.error) {
        setSearchResults(data);
      }
    } catch (e) {
      const library = [...FALLBACK_MUSIC, ...globalMusic];
      const filtered = library.filter(m => 
        m.title.toLowerCase().includes(query.toLowerCase()) || 
        m.artist.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist || !newSong.url) return;
    try {
      const docRef = await addDoc(collection(db, 'music'), {
        ...newSong,
        addedBy: profile.uid,
        createdAt: serverTimestamp(),
      });
      const added = { ...newSong, id: docRef.id } as MusicMetadata;
      setGlobalMusic(prev => [added, ...prev]);
      setShowAddSong(false);
      setNewSong({ title: '', artist: '', url: '' });
    } catch (e) {
      console.error("Add song failed:", e);
    }
  };

  const handlePost = async () => {
    if (!imageUrl) return;
    setIsUploading(true);
    try {
      if (type === 'post') {
        await addDoc(collection(db, 'posts'), {
          userId: profile.uid,
          caption,
          imageUrl,
          likesCount: 0,
          commentsCount: 0,
          filter: selectedFilter,
          fontStyle: selectedFont,
          music: selectedMusic,
          createdAt: serverTimestamp(),
        });
      } else {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await addDoc(collection(db, 'stories'), {
          userId: profile.uid,
          mediaUrl: imageUrl,
          mediaType: 'image',
          caption,
          filter: selectedFilter,
          fontStyle: selectedFont,
          music: selectedMusic,
          createdAt: serverTimestamp(),
          expiresAt: expiresAt.toISOString(),
        });
      }
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getFilterClass = (filterId: string) => {
    return FILTERS.find(f => f.id === filterId)?.class || '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-zinc-900 md:rounded-[3rem] border-t md:border border-zinc-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full md:h-auto md:max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl shrink-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button 
              onClick={() => setType('post')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                type === 'post' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Feed Post
            </button>
            <button 
              onClick={() => setType('moment')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                type === 'moment' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Moment
            </button>
          </div>

          <button 
            disabled={!imageUrl || isUploading}
            onClick={handlePost}
            className="px-6 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-all flex items-center gap-2"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Transmit
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          <div className="flex gap-4 items-start">
             <div className="w-12 h-12 rounded-2xl border-2 border-indigo-500 overflow-hidden shrink-0">
                <img src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} alt="" />
             </div>
             <textarea 
               value={caption}
               onChange={(e) => setCaption(e.target.value)}
               placeholder={type === 'post' ? "Synchronize your neural thoughts..." : "Index your moment scan..."}
               className={cn(
                 "flex-1 bg-transparent border-none text-xl font-medium focus:ring-0 placeholder:text-zinc-600 resize-none min-h-[80px]",
                 selectedFont
               )}
             />
          </div>

          {!imageUrl ? (
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setImageUrl(`https://picsum.photos/seed/${Math.random()}/1080/1350`)}
                className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
              >
                <div className="p-5 bg-zinc-900 rounded-3xl group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Neural Deck</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Upload Visuals</p>
                </div>
              </button>
              <button 
                onClick={() => setImageUrl(`https://picsum.photos/seed/${Math.random()}/1080/1920`)}
                className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
              >
                <div className="p-5 bg-zinc-900 rounded-3xl group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Live Scan</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Direct Sensor</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative group rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl bg-black">
                <img src={imageUrl} className={cn("w-full h-auto object-cover max-h-[400px] transition-all", getFilterClass(selectedFilter))} alt="Preview" />
                <button 
                  onClick={() => setImageUrl('')}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
                {selectedMusic && (
                  <div className="absolute bottom-4 left-4 bg-indigo-600 p-2 rounded-xl flex items-center gap-2 text-white shadow-xl">
                    <Music className="w-4 h-4 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedMusic.title}</span>
                  </div>
                )}
              </div>

              {/* Creative Tools Switcher */}
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-4">
                 <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-4 overflow-x-auto no-scrollbar">
                    {(['info', 'filter', 'music', 'font'] as const).map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                          activeTab === tab ? "bg-zinc-800 text-indigo-400" : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                         {tab === 'info' && <Smile className="w-3.5 h-3.5" />}
                         {tab === 'filter' && <Wand2 className="w-3.5 h-3.5" />}
                         {tab === 'music' && <Music className="w-3.5 h-3.5" />}
                         {tab === 'font' && <Type className="w-3.5 h-3.5" />}
                         {tab}
                      </button>
                    ))}
                 </div>

                 <div className="min-h-[60px]">
                    {activeTab === 'filter' && (
                      <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                        {FILTERS.map(f => (
                          <button 
                            key={f.id}
                            onClick={() => setSelectedFilter(f.id)}
                            className="flex flex-col items-center gap-2 group"
                          >
                             <div className={cn(
                               "w-16 h-16 rounded-2xl bg-zinc-900 border-2 transition-all overflow-hidden",
                               selectedFilter === f.id ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-zinc-800 group-hover:border-zinc-700"
                             )}>
                                <img src={imageUrl} className={cn("w-full h-full object-cover", f.class)} alt="" />
                             </div>
                             <span className="text-[10px] font-bold text-zinc-500 uppercase">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeTab === 'font' && (
                      <div className="grid grid-cols-2 gap-2">
                         {FONTS.map(f => (
                           <button 
                            key={f.id}
                            onClick={() => setSelectedFont(f.id)}
                            className={cn(
                              "p-3 rounded-2xl border-2 text-left transition-all",
                              selectedFont === f.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                            )}
                           >
                              <p className={cn("text-xs font-black uppercase tracking-widest", f.id)}>{f.label}</p>
                              <p className="text-[8px] opacity-50 mt-1">Transcend Reality</p>
                           </button>
                         ))}
                      </div>
                    )}

                    {activeTab === 'music' && (
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                               <Sparkles className="w-3 h-3" /> Audio Registry
                            </p>
                            <button 
                              onClick={() => setShowAddSong(!showAddSong)}
                              className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                               {showAddSong ? 'Close' : 'Add Song'}
                            </button>
                         </div>

                         {showAddSong ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4 shadow-xl"
                            >
                               <div className="space-y-2">
                                  <input 
                                    type="text" 
                                    placeholder="Song Title"
                                    value={newSong.title}
                                    onChange={e => setNewSong({...newSong, title: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Artist Name"
                                    value={newSong.artist}
                                    onChange={e => setNewSong({...newSong, artist: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="MP3 URL (SoundHelix/etc)"
                                    value={newSong.url}
                                    onChange={e => setNewSong({...newSong, url: e.target.value})}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                                  />
                               </div>
                               <button 
                                 onClick={handleAddSong}
                                 disabled={!newSong.title || !newSong.artist || !newSong.url}
                                 className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                  Register Signal
                               </button>
                            </motion.div>
                         ) : (
                            <div className="relative">
                               <Music className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isSearching ? "animate-spin text-indigo-400" : "text-zinc-500")} />
                               <input 
                                 type="text"
                                 value={searchQuery}
                                 onChange={(e) => {
                                   setSearchQuery(e.target.value);
                                   handleSpotifySearch(e.target.value);
                                 }}
                                 placeholder="Search Registry..."
                                 className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-white placeholder:text-zinc-700"
                               />
                            </div>
                         )}

                         <div className="space-y-2 max-h-[240px] overflow-y-auto no-scrollbar pb-4">
                            {searchResults.length > 0 ? (
                              searchResults.map(m => (
                                <button 
                                 key={m.id}
                                 onClick={() => setSelectedMusic(selectedMusic?.id === m.id ? null : m)}
                                 className={cn(
                                   "w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all",
                                   selectedMusic?.id === m.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                 )}
                                >
                                   <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                                         {(m as any).albumArt ? (
                                           <img src={(m as any).albumArt} className="w-full h-full object-cover" alt="" />
                                         ) : (
                                           <div className="w-full h-full flex items-center justify-center bg-indigo-500/10">
                                              <Music className={cn("w-4 h-4 text-indigo-400", selectedMusic?.id === m.id && "animate-pulse")} />
                                           </div>
                                         )}
                                      </div>
                                      <div className="text-left overflow-hidden">
                                         <p className="text-xs font-black uppercase tracking-tighter truncate">{m.title}</p>
                                         <p className="text-[8px] opacity-70 truncate">{m.artist}</p>
                                      </div>
                                   </div>
                                   {selectedMusic?.id === m.id && (
                                     <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping shrink-0 ml-2" />
                                   )}
                                </button>
                              ))
                            ) : searchQuery ? (
                              <p className="text-[10px] text-center text-zinc-600 py-8 uppercase tracking-widest font-black">No audio signals found</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2">
                                   <Sparkles className="w-3 h-3" /> Trending Uplink
                                </p>
                                {[...globalMusic, ...FALLBACK_MUSIC].map((m, idx) => (
                                  <button 
                                   key={m.id || idx}
                                   onClick={() => setSelectedMusic(selectedMusic?.id === m.id ? null : m)}
                                   className={cn(
                                     "w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all",
                                     selectedMusic?.id === m.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                   )}
                                  >
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                           <Music className={cn("w-4 h-4", selectedMusic?.id === m.id && "animate-pulse")} />
                                        </div>
                                        <div className="text-left">
                                           <p className="text-xs font-black uppercase tracking-tighter">{m.title}</p>
                                           <p className="text-[8px] opacity-50">{m.artist}</p>
                                        </div>
                                     </div>
                                     {selectedMusic?.id === m.id && (
                                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                                     )}
                                  </button>
                                ))}
                              </div>
                            )}
                         </div>
                      </div>
                    )}

                    {activeTab === 'info' && (
                      <div className="flex items-center gap-4 py-2">
                         <div className="flex items-center gap-2 p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                            <MapPin className="w-4 h-4 text-zinc-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add Origin</span>
                         </div>
                         <div className="flex items-center gap-2 p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                            <Sparkles className="w-4 h-4 text-zinc-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI Enhance</span>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
