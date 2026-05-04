import React, { useEffect, useState } from 'react';
import { UserProfile, Story } from '../types';
import { 
  Camera, 
  Plus, 
  CirclePlay, 
  LogOut,
  ChevronLeft, 
  ChevronRight, 
  X,
  PlusCircle,
  Clock,
  Heart,
  Send,
  Share2,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

interface StoriesViewProps {
  currentUser: UserProfile;
}

export default function StoriesView({ currentUser }: StoriesViewProps) {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    // Current time in ISO format for comparison
    const now = new Date().toISOString();
    
    const q = query(
      collection(db, 'stories'), 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Story[];
      setStories(storiesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStoryAction = async (storyId: string, action: 'like' | 'reply') => {
    // In a real app, stories might have a likes count or send a notification/DM
    if (action === 'like') {
       // Placeholder for story like - could use a separate reactions collection
       console.log('Moment resonance detected! (Liked)');
    } else if (action === 'reply' && replyText.trim()) {
       console.log(`Transmitting reply to neural link: ${replyText}`);
       setReplyText('');
    }
  };

  const handleShareStory = (story: Story) => {
    const url = window.location.href;
    navigator.clipboard.writeText(`${url}?story=${story.id}`);
    console.log('Moment link copied to neural buffer!');
  };

  return (
    <div className="flex gap-4 items-center">
      {/* ... prev code ... */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const event = new CustomEvent('navigate', { detail: 'create' });
          window.dispatchEvent(event);
        }}
        className="w-16 h-16 rounded-2xl bg-indigo-600/10 border-2 border-dashed border-indigo-500/50 flex items-center justify-center shrink-0 group hover:bg-indigo-600 hover:border-indigo-600 transition-all shadow-[0_0_15px_rgba(79,70,229,0.1)]"
      >
        <Plus className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
      </motion.button>

      {loading ? (
        <div className="flex gap-4">
           {[1, 2, 3].map(i => (
             <div key={i} className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
           ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="px-4">
           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">No active frequency...</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
          {stories.map((story) => (
            <motion.button
              key={story.id}
              whileHover={{ y: -3, scale: 1.05 }}
              onClick={() => setSelectedStory(story)}
              className="w-16 h-16 rounded-2xl bg-zinc-900 overflow-hidden relative group border-2 border-indigo-500 shrink-0 shadow-lg shadow-indigo-500/20"
            >
               <img src={story.mediaUrl} className="w-full h-full object-cover opacity-80" alt="" />
               <div className="absolute inset-0 bg-black/20" />
               <div className="absolute inset-0 border-2 border-black/40 rounded-2xl" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Story Viewer Overlay */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] glass flex items-center justify-center p-4 bg-black/95"
          >
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-[210]">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border-2 border-indigo-500 overflow-hidden">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStory.userId}`} alt="" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-tighter">Node_{selectedStory.userId.slice(0, 5)}</p>
                    <p className="text-white/50 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                       <Clock className="w-2 h-2" />
                       Frequency Open
                    </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => handleShareStory(selectedStory)}
                    className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-white transition-all border border-white/5"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedStory(null)}
                    className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-white transition-all border border-white/5"
                  >
                    <X className="w-5 h-5" />
                  </button>
               </div>
            </div>

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative max-w-sm w-full aspect-[9/16] bg-zinc-900 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.3)] border border-zinc-800"
            >
               <img 
                src={selectedStory.mediaUrl} 
                className={cn(
                  "w-full h-full object-cover transition-all duration-700",
                  selectedStory.filter && selectedStory.filter !== 'none' ? selectedStory.filter : ''
                )} 
                alt="" 
               />

               {selectedStory.caption && (
                 <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                    <motion.p 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "text-white text-3xl font-black text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] px-4 py-2 bg-black/20 backdrop-blur-sm rounded-2xl",
                        selectedStory.fontStyle
                      )}
                    >
                       {selectedStory.caption}
                    </motion.p>
                 </div>
               )}

               {selectedStory.music && (
                 <div className="absolute top-20 left-6 right-6 flex items-center gap-3 px-4 py-3 bg-indigo-600/90 backdrop-blur-xl rounded-2xl text-white shadow-2xl animate-in slide-in-from-top duration-500">
                    <Music className="w-5 h-5 animate-pulse" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{selectedStory.music.title}</span>
                       <span className="text-[8px] text-white/60 uppercase tracking-widest leading-tight">{selectedStory.music.artist}</span>
                    </div>
                 </div>
               )}
               
               {/* Progress bars */}
               <div className="absolute top-6 left-6 right-6 flex gap-1.5 z-50">
                  <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                     <motion.div 
                      key={selectedStory.id}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5 }}
                      onAnimationComplete={() => setSelectedStory(null)}
                      className="h-full bg-white shadow-[0_0_10px_white]"
                     />
                  </div>
               </div>

               {/* Interaction Footer */}
               <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                  <div className="flex-1 relative">
                     <input 
                       type="text"
                       value={replyText}
                       onChange={(e) => setReplyText(e.target.value)}
                       placeholder="Reply to frequency..."
                       className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/40 focus:ring-1 focus:ring-indigo-500"
                       onKeyDown={(e) => e.key === 'Enter' && handleStoryAction(selectedStory.id, 'reply')}
                     />
                     <button 
                       onClick={() => handleStoryAction(selectedStory.id, 'reply')}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                     >
                        <Send className="w-4 h-4" />
                     </button>
                  </div>
                  <button 
                    onClick={() => handleStoryAction(selectedStory.id, 'like')}
                    className="p-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-rose-500 hover:text-white text-white/80 transition-all active:scale-95 group"
                  >
                    <Heart className="w-6 h-6 group-hover:fill-current" />
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
