import React, { useEffect, useState } from 'react';
import { UserProfile, Post } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Grid, 
  MapPin, 
  Users, 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  MoreHorizontal, 
  Heart,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  Share2,
  X,
  Music
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc
} from 'firebase/firestore';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import CommentModal from './CommentModal';

interface UserProfileViewProps {
  userId: string;
  currentUser: UserProfile;
  onBack?: () => void;
  onMessage?: (targetId: string) => void;
}

export default function UserProfileView({ userId, currentUser, onBack, onMessage }: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasStory, setHasStory] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showComments, setShowComments] = useState(false);

  const isOwnProfile = currentUser.uid === userId;

  useEffect(() => {
    // Fetch profile data
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      }
    };
    fetchProfile();

    // Fetch posts
    const q = query(
      collection(db, 'posts'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubPosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    // Check for stories
    const now = new Date().toISOString();
    const storyQ = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      where('expiresAt', '>', now)
    );
    const unsubStories = onSnapshot(storyQ, (snap) => {
      setHasStory(!snap.empty);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });

    // Check if following
    if (!isOwnProfile) {
      const followRef = doc(db, 'follows', `${currentUser.uid}_${userId}`);
      const unsubFollow = onSnapshot(followRef, (snap) => {
        setIsFollowing(snap.exists());
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `follows/${currentUser.uid}_${userId}`);
      });
      return () => { unsubPosts(); unsubStories(); unsubFollow(); };
    }

    return () => { unsubPosts(); unsubStories(); };
  }, [userId, currentUser.uid, isOwnProfile]);

  const handleFollow = async () => {
    if (isOwnProfile) return;
    const followId = `${currentUser.uid}_${userId}`;
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        await updateDoc(doc(db, 'users', userId), { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
      } else {
        await setDoc(doc(db, 'follows', followId), {
          followerId: currentUser.uid,
          followingId: userId,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'users', userId), { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
    }
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    const shareUrl = `${url.split('?')[0]}?profile=${userId}`;
    navigator.clipboard.writeText(shareUrl);
    console.log('Neural profile link copied to buffer!');
  };

  const handleLikePost = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likesCount: increment(1)
      });
      if (selectedPost?.id === post.id) {
         setSelectedPost({ ...selectedPost, likesCount: selectedPost.likesCount + 1 });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleSharePost = (post: Post) => {
    const url = window.location.href;
    const shareUrl = `${url.split('?')[0]}?post=${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    console.log('Transmission link copied to neural buffer!');
  };

  if (!profile && loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Accessing Node Data...</p>
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-6">
       <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-[2rem] flex items-center justify-center">
          <Clock className="w-8 h-8 text-zinc-700" />
       </div>
       <div>
         <h3 className="text-xl font-black uppercase tracking-tighter">Node Not Found</h3>
         <p className="text-sm text-zinc-500 mt-2">This neural signature does not exist in the Nexus.</p>
       </div>
       {onBack && (
         <button onClick={onBack} className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs">
           <ChevronLeft className="w-4 h-4" /> Return to Origin
         </button>
       )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-black">
      <AnimatePresence>
         {showComments && selectedPost && (
           <CommentModal 
             post={selectedPost} 
             profile={currentUser} 
             onClose={() => setShowComments(false)} 
           />
         )}
         {selectedPost && !showComments && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
           >
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-8 right-8 p-3 bg-zinc-800 rounded-2xl text-white z-[160] hover:bg-zinc-700 transition-all border border-zinc-700"
              >
                <X className="w-6 h-6" />
              </button>

              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-4xl bg-zinc-900 rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(79,70,229,0.2)] border border-zinc-800"
              >
                 <div className="flex-1 bg-black aspect-square md:aspect-auto relative group">
                    <img 
                      src={selectedPost.imageUrl} 
                      className={cn(
                        "w-full h-full object-contain transition-all",
                        selectedPost.filter && selectedPost.filter !== 'none' ? selectedPost.filter : ''
                      )} 
                      alt="" 
                    />
                    {selectedPost.music && (
                      <div className="absolute bottom-6 left-6 flex items-center gap-3 p-3 bg-black/60 backdrop-blur-xl rounded-2xl text-white border border-white/10 shadow-2xl">
                         <Music className="w-4 h-4 text-indigo-400 animate-pulse" />
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{selectedPost.music.title}</span>
                            <span className="text-[8px] text-zinc-400 uppercase tracking-widest leading-tight">{selectedPost.music.artist}</span>
                         </div>
                      </div>
                    )}
                 </div>
                 <div className="w-full md:w-96 flex flex-col p-8 space-y-6">
                    <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
                       <div className="w-10 h-10 rounded-xl border border-indigo-500 overflow-hidden">
                          <img src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} alt="" />
                       </div>
                       <div>
                          <p className="font-black text-sm uppercase">{profile.displayName}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">@{profile.username}</p>
                       </div>
                    </div>

                    <div className="flex-1 space-y-4">
                       {selectedPost.caption && (
                         <p className={cn("text-sm text-zinc-300 leading-relaxed font-medium", selectedPost.fontStyle)}>
                            <span className="font-black text-white mr-2 italic">LOG:</span>
                            {selectedPost.caption}
                         </p>
                       )}
                       <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(selectedPost.createdAt))} ago
                       </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-800 space-y-6">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handleLikePost(selectedPost)}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
                             >
                                <Heart className="w-4 h-4 fill-current" />
                                <span className="font-black text-xs">{selectedPost.likesCount}</span>
                             </button>
                             <button 
                                onClick={() => setShowComments(true)}
                                className="flex items-center gap-2 p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                             >
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-black text-xs">{selectedPost.commentsCount || 0}</span>
                             </button>
                          </div>
                          <button 
                            onClick={() => handleSharePost(selectedPost)}
                            className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                          >
                             <Share2 className="w-5 h-5" />
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Header / Cover Space */}
      <div className="h-32 bg-gradient-to-b from-indigo-500/10 to-transparent flex items-start p-6">
        {onBack && (
          <button onClick={onBack} className="p-3 bg-black/50 backdrop-blur-xl border border-white/5 rounded-2xl text-white hover:bg-zinc-800 transition-all">
             <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-6 pb-20 -mt-16">
        {/* Profile Info */}
        <div className="space-y-6">
           <div className="flex items-end justify-between">
              <div className="relative">
                 <div className={cn(
                   "w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] border-4 border-black bg-zinc-900 overflow-hidden shadow-2xl relative",
                   hasStory && "ring-4 ring-indigo-500 ring-offset-4 ring-offset-black"
                 )}>
                    <img src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-[2.5rem]" />
                 </div>
                 <div className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 rounded-xl border-4 border-black shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                 </div>
              </div>

              <div className="flex gap-3 pb-2">
                 {!isOwnProfile ? (
                   <>
                     <button 
                        onClick={handleFollow}
                        className={cn(
                          "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                          isFollowing ? "bg-zinc-800 text-zinc-400 font-bold" : "bg-white text-black hover:bg-zinc-200"
                        )}
                     >
                       {isFollowing ? 'Disconnecting...' : 'Establish Link'}
                     </button>
                     <button 
                        onClick={() => onMessage?.(userId)}
                        className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white hover:bg-zinc-800 transition-all"
                     >
                       <MessageSquare className="w-5 h-5" />
                     </button>
                   </>
                 ) : (
                   <button className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all">
                      Edit Profile
                   </button>
                 )}
                 <button 
                   onClick={handleShareProfile}
                   className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white hover:bg-zinc-800 transition-all"
                 >
                    <Share2 className="w-5 h-5" />
                 </button>
                 <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white hover:bg-zinc-800 transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                 </button>
              </div>
           </div>

           <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                {profile.displayName}
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              </h1>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] mt-1">@{profile.username}</p>
              
              {profile.bio && (
                <p className="mt-4 text-sm leading-relaxed text-zinc-300 font-medium max-w-lg">
                   {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-6 mt-6">
                 <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>Earth_Orbit_7</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                       <span className="font-black text-white">{profile.followersCount || 0}</span>
                       <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Followers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <span className="font-black text-white">{profile.followingCount || 0}</span>
                       <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Following</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Dynamic Tabs */}
        <div className="mt-12 border-b border-zinc-800/50">
           <div className="flex items-center gap-8">
              {(['posts', 'saved', 'tagged'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative",
                    activeTab === tab ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  )}
                </button>
              ))}
           </div>
        </div>

        <div className="mt-8">
           {activeTab === 'posts' && (
             <div className="grid grid-cols-3 gap-2 md:gap-4">
                {posts.map((post) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="aspect-square bg-zinc-900 rounded-3xl md:rounded-[2.5rem] overflow-hidden group relative cursor-pointer"
                  >
                     <img src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                     
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                        <div className="flex items-center gap-4 text-white">
                           <div className="flex items-center gap-1.5 font-black">
                              <Heart className="w-5 h-5 fill-current" />
                              <span>{post.likesCount}</span>
                           </div>
                           <div className="flex items-center gap-1.5 font-black">
                              <MessageCircle className="w-5 h-5 fill-current" />
                              <span>{post.commentsCount || 0}</span>
                           </div>
                        </div>
                     </div>
                  </motion.div>
                ))}
                {posts.length === 0 && !loading && (
                  <div className="col-span-3 py-20 text-center">
                     <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                        <Grid className="w-6 h-6 text-zinc-800" />
                     </div>
                     <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No Transmissions Recorded</p>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
