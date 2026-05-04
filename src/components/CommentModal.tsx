import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Clock } from 'lucide-react';
import { UserProfile, Post, PostComment } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  increment 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

interface CommentModalProps {
  post: Post;
  profile: UserProfile;
  onClose: () => void;
}

export default function CommentModal({ post, profile, onClose }: CommentModalProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      })) as PostComment[]);
    });
    return () => unsubscribe();
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        userId: profile.uid,
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
           <h3 className="text-xl font-black uppercase tracking-tighter">Transmission Intel</h3>
           <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
           {comments.map((comment) => (
             <div key={comment.id} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg border border-indigo-500/30 overflow-hidden shrink-0">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} alt="" />
                </div>
                <div className="flex-1 space-y-1">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-zinc-400">Node_{comment.userId.slice(0, 5)}</span>
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter flex items-center gap-1">
                         <Clock className="w-2.5 h-2.5" />
                         {formatDistanceToNow(new Date(comment.createdAt))}
                      </span>
                   </div>
                   <p className="text-sm text-zinc-300 leading-relaxed font-medium">{comment.text}</p>
                </div>
             </div>
           ))}
           {comments.length === 0 && (
             <div className="py-12 text-center">
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No signals received yet.</p>
             </div>
           )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 bg-zinc-950 border-t border-zinc-800 flex gap-3">
           <input 
             value={newComment}
             onChange={(e) => setNewComment(e.target.value)}
             placeholder="Synchronize your response..."
             className="flex-1 bg-zinc-900 border-zinc-800 rounded-xl text-sm px-4 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
           />
           <button 
             disabled={!newComment.trim() || isSubmitting}
             className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
              <Send className="w-4 h-4" />
           </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
