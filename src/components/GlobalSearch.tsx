import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  setDoc, 
  doc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { UserProfile, Conversation } from '../types';
import { Search as SearchIcon, UserPlus, UserCheck, MessageSquare, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function GlobalSearch({ currentUser, onSelectChat, onSelectUser }: {
  currentUser: UserProfile;
  onSelectChat: (conv: Conversation) => void;
  onSelectUser?: (userId: string) => void;
}) {
  const [queryStr, setQueryStr] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryStr) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '>=', queryStr), 
        where('username', '<=', queryStr + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== currentUser.uid);
      setResults(users);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (user: UserProfile) => {
    const convId = [currentUser.uid, user.uid].sort().join('_');
    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);

    if (!convSnap.exists()) {
      const newConv: Partial<Conversation> = {
        id: convId,
        participants: [currentUser.uid, user.uid],
        type: 'direct',
        updatedAt: new Date().toISOString(),
        metadata: {
          name: user.displayName,
          icon: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
        }
      };
      await setDoc(convRef, newConv);
      onSelectChat(newConv as Conversation);
    } else {
      onSelectChat(convSnap.data() as Conversation);
    }
  };

  const sendRequest = async (user: UserProfile) => {
    const requestId = `${currentUser.uid}_${user.uid}`;
    await setDoc(doc(db, 'requests', requestId), {
      id: requestId,
      fromId: currentUser.uid,
      toId: user.uid,
      status: 'pending',
      type: 'follow',
      createdAt: serverTimestamp()
    });
    alert('Follow request sent!');
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-8">
      <div className="mb-12">
        <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Explore People</h2>
        <p className="text-zinc-500">Find and connect with users around the world</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-12">
        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl -z-10 rounded-full" />
        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
        <input
          type="text"
          value={queryStr}
          onChange={(e) => setQueryStr(e.target.value)}
          placeholder="Search by username (e.g. johndoe)"
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl pl-16 pr-6 py-5 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xl"
        />
      </form>

      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {results.map((user) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={user.uid}
              className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between hover:bg-zinc-900 transition-all group"
            >
              <div 
                onClick={() => onSelectUser?.(user.uid)}
                className="flex items-center gap-5 cursor-pointer flex-1"
              >
                 <div className="relative">
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                      className="w-16 h-16 rounded-2xl border-2 border-zinc-700 bg-zinc-800" 
                      alt="" 
                    />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 border-2 border-zinc-900 rounded-full",
                      user.status === 'online' ? "bg-green-500" : "bg-zinc-600"
                    )} />
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-lg">{user.displayName}</h3>
                       <span className="text-xs text-zinc-500 font-mono">@{user.username}</span>
                       {user.isPrivate && <Lock className="w-3.5 h-3.5 text-zinc-600" />}
                    </div>
                    <p className="text-zinc-500 text-sm line-clamp-1">{user.bio || 'No bio yet.'}</p>
                 </div>
              </div>

              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                <button 
                  onClick={() => startChat(user)}
                  className="p-4 bg-zinc-800 hover:bg-indigo-600 text-white rounded-2xl transition-all"
                  title="Message"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => sendRequest(user)}
                  className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                  title="Follow"
                >
                  {user.isPrivate ? <UserPlus className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {!searching && results.length === 0 && queryStr && (
           <p className="text-center text-zinc-600 py-12">No users found matching "{queryStr}"</p>
        )}
      </div>
    </div>
  );
}
