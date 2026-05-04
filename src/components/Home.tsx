import React, { useEffect, useState } from 'react';
import { UserProfile, Post } from '../types';
import StoriesView from './StoriesView';
import { getRecommendations } from '../services/recommendations';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, TrendingUp, Users, Search, X, Heart, MessageCircle, Share2, MoreHorizontal, Clock, User as UserIcon, Image as ImageIcon, Music } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import UserProfileView from './UserProfileView';
import CommentModal from './CommentModal';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { APP_NAME } from '../constants';

export default function Home({ profile }: { profile: UserProfile }) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);

  useEffect(() => {
    getRecommendations(profile.bio || profile.displayName).then(setRecommendations);
  }, [profile.bio, profile.displayName]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      })) as Post[];
      setPosts(postsData);
      setLoadingPosts(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likesCount: increment(1)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleShare = (post: Post) => {
    const url = window.location.href;
    const shareUrl = `${url.split('?')[0]}?post=${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Transmission link copied to neural buffer!');
  };

  if (viewingProfileId) {
    return (
      <UserProfileView 
        userId={viewingProfileId} 
        currentUser={profile} 
        onBack={() => setViewingProfileId(null)}
        onMessage={(id) => {
          setViewingProfileId(null);
          const event = new CustomEvent('navigate', { detail: 'messenger' });
          window.dispatchEvent(event);
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto space-y-12 no-scrollbar pb-32">
      <AnimatePresence>
        {activeCommentPost && (
          <CommentModal 
            post={activeCommentPost} 
            profile={profile} 
            onClose={() => setActiveCommentPost(null)} 
          />
        )}
        {showSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] glass p-6 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto">
              <button 
                onClick={() => setShowSearch(false)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
              <GlobalSearch 
                currentUser={profile} 
                onSelectChat={() => setShowSearch(false)} 
                onSelectUser={(userId) => {
                  setViewingProfileId(userId);
                  setShowSearch(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Moments</h2>
          <div className="flex gap-4">
             <button 
              onClick={() => setShowSearch(true)}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"
             >
                <Search className="w-5 h-5" />
             </button>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <StoriesView currentUser={profile} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Feed Transmissions
           </h2>

           {loadingPosts ? (
             <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] h-96 animate-pulse" />
                ))}
             </div>
           ) : posts.length === 0 ? (
             <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-[3rem] p-20 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                   <ImageIcon className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 font-bold">No transmissions detected.</p>
                <p className="text-zinc-600 text-xs mt-2">Be the first to sync a new visual record.</p>
             </div>
           ) : (
             <div className="space-y-8">
                {posts.map((post) => (
                  <motion.article 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={post.id} 
                    className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden group shadow-2xl hover:border-zinc-700 transition-all"
                  >
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between">
                       <button 
                         onClick={() => setViewingProfileId(post.userId)}
                         className="flex items-center gap-3 group/author"
                       >
                          <div className="w-10 h-10 rounded-xl border-2 border-indigo-500 overflow-hidden group-hover/author:ring-2 ring-indigo-500/50 transition-all">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} alt="" />
                          </div>
                          <div className="text-left">
                             <p className="text-sm font-black tracking-tight group-hover/author:text-indigo-400 transition-colors">{post.userId === profile.uid ? 'Neural Link (You)' : `User_${post.userId.slice(0, 5)}`}</p>
                             <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(post.createdAt))} ago
                             </div>
                          </div>
                       </button>
                       <button className="p-2 text-zinc-500 hover:text-white transition-all">
                          <MoreHorizontal className="w-5 h-5" />
                       </button>
                    </div>

                    {/* Image */}
                    <div className="aspect-square bg-zinc-950 overflow-hidden relative group/img">
                       <img 
                        src={post.imageUrl} 
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110",
                          post.filter && post.filter !== 'none' ? post.filter : ''
                        )} 
                        alt="" 
                       />
                       {post.music && (
                         <div className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-2xl">
                            <Music className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{post.music.title}</span>
                               <span className="text-[8px] text-zinc-400 uppercase tracking-widest leading-tight">{post.music.artist}</span>
                            </div>
                         </div>
                       )}
                    </div>

                    {/* Actions */}
                    <div className="p-6 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handleLike(post.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
                             >
                                <Heart className="w-4 h-4 fill-current" />
                                <span className="font-black text-xs">{post.likesCount}</span>
                             </button>
                             <button 
                               onClick={() => setActiveCommentPost(post)}
                               className="flex items-center gap-2 p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                             >
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-black text-xs">{post.commentsCount || 0}</span>
                             </button>
                             <button 
                               onClick={() => handleShare(post)}
                               className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                             >
                                <Share2 className="w-4 h-4" />
                             </button>
                          </div>
                          
                          <div className="px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded-full flex items-center gap-2">
                             <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Secured</span>
                          </div>
                       </div>

                       {post.caption && (
                         <div className="space-y-1">
                            <p className={cn("text-sm leading-relaxed text-zinc-300", post.fontStyle)}>
                               <span className="font-black text-white mr-2 uppercase tracking-tighter italic">Nexus_Msg:</span>
                               {post.caption}
                            </p>
                         </div>
                       )}
                    </div>
                  </motion.article>
                ))}
             </div>
           )}
        </div>

        <aside className="space-y-8">
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              {APP_NAME} Intel
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={rec} 
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between group/item hover:border-indigo-500/50 transition-all cursor-pointer"
                >
                  <span className="font-medium text-xs text-zinc-400 group-hover:text-white transition-colors">{rec}</span>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <span className="text-indigo-400 text-[10px] font-bold uppercase">Sync</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              Security Node
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                 <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Auth_Status</p>
                    <p className="text-[10px] text-zinc-500">Node verified. Identity link stable.</p>
                 </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

