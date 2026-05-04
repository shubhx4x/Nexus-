import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, limit, doc, getDoc, updateDoc, deleteDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Conversation, MusicMetadata } from '../types';
import { 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  Search, 
  Eye,
  Activity,
  Server,
  Lock,
  X,
  Music,
  Megaphone,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { onSnapshot } from 'firebase/firestore';

function AdminChatMonitor({ conversationId, devUid }: { conversationId: string, devUid: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, `conversations/${conversationId}/messages`));
    return () => unsub();
  }, [conversationId]);

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        convId: conversationId,
        senderId: devUid,
        text: `[DEV_ADMIN]: ${input}`,
        type: 'text',
        readBy: [devUid],
        deletedBy: [],
        createdAt: serverTimestamp(),
        isUnsent: false
      });
      setInput('');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}/messages (admin)`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 space-y-4 font-mono text-xs overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex gap-4">
             <div className="shrink-0 flex flex-col gap-1 items-center">
                <span className="text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">AUTH_ID: {msg.senderId?.slice(0, 8)}</span>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} className="w-6 h-6 rounded-full border border-zinc-700" alt="" />
             </div>
             <div className="flex-1">
                <p className="text-zinc-300 whitespace-pre-wrap">{msg.text || (msg.type === 'image' ? '[IMAGE ATTACHMENT]' : '[FILE ATTACHMENT]')}</p>
                <div className="flex items-center gap-4 mt-2 text-[9px] text-zinc-600 uppercase font-black">
                   <span>REC_HEX: {msg.id.slice(0, 12)}</span>
                   <span>TS: {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'PRE-COMMIT'}</span>
                </div>
             </div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-center text-zinc-600 italic">No message history found for this pipe.</p>}
      </div>

      <form onSubmit={sendAdminMessage} className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-3xl flex gap-3">
         <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Inject administrative message..."
          className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white px-2"
         />
         <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            Inject
         </button>
      </form>
    </div>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [music, setMusic] = useState<MusicMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'users' | 'chats' | 'music' | 'broadcast'>('users');
  const [viewingChat, setViewingChat] = useState<Conversation | null>(null);

  const [broadcast, setBroadcast] = useState({ message: '', type: 'info' });

  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        setUsers(uSnap.docs.map(doc => doc.data() as UserProfile));

        const cSnap = await getDocs(query(collection(db, 'conversations'), limit(50)));
        setConversations(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));

        const mSnap = await getDocs(query(collection(db, 'music'), limit(50)));
        setMusic(mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MusicMetadata)));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'admin_collections');
        setError(err.message || "Access Denied: You may not have administrative privileges.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const deleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(u => u.uid !== userId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    }
  };

  const toggleVerify = async (user: UserProfile) => {
     const newRole = user.role === 'developer' ? 'user' : 'developer';
     try {
       await updateDoc(doc(db, 'users', user.uid), { role: newRole });
       setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
     } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
     }
  };

  const deleteMusic = async (songId: string) => {
    if (confirm('De-list this audio signal from the registry?')) {
      try {
        await deleteDoc(doc(db, 'music', songId));
        setMusic(music.filter(m => m.id !== songId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `music/${songId}`);
      }
    }
  };

  const sendBroadcast = async () => {
    if (!broadcast.message) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        ...broadcast,
        active: true,
        createdAt: serverTimestamp()
      });
      setBroadcast({ message: '', type: 'info' });
      console.log('Broadcast Signal Transmitted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'announcements');
    }
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto relative">
      {/* Chat View Overlay for Admin */}
      <AnimatePresence>
        {viewingChat && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-[100] bg-black border border-zinc-800 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
          >
             <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <ShieldAlert className="text-amber-500 w-5 h-5" />
                   <span className="font-bold uppercase tracking-widest text-xs">Admin Monitoring Mode: {viewingChat.id}</span>
                </div>
                <button onClick={() => setViewingChat(null)} className="p-2 hover:bg-zinc-800 rounded-xl">
                   <X className="w-6 h-6" />
                </button>
             </div>
             <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                   <AdminChatMonitor conversationId={viewingChat.id} devUid={currentUser?.uid || 'admin'} />
                </div>
                <div className="p-6 bg-zinc-900 border-t border-zinc-800 text-center">
                   <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                      End-to-End Monitoring Active | Intercept Status: SILENT
                   </p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 font-mono text-sm">
           <ShieldAlert className="w-5 h-5 shrink-0" />
           <p>{error}</p>
        </div>
      )}

      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black mb-2 tracking-tighter">DEVELOPER HUB</h2>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Authorized Access: gamechangers4200@gmail.com</p>
          <div className="flex gap-4 mt-6">
             <button 
              onClick={() => setView('users')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                view === 'users' ? "bg-white text-black shadow-lg shadow-white/10" : "bg-zinc-900 text-zinc-500 hover:text-white"
              )}
             >
                Registry
             </button>
             <button 
              onClick={() => setView('chats')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                view === 'chats' ? "bg-white text-black shadow-lg shadow-white/10" : "bg-zinc-900 text-zinc-500 hover:text-white"
              )}
             >
                Data Streams
             </button>
             <button 
              onClick={() => setView('music')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                view === 'music' ? "bg-white text-black shadow-lg shadow-white/10" : "bg-zinc-900 text-zinc-500 hover:text-white"
              )}
             >
                Audio Nodes
             </button>
             <button 
              onClick={() => setView('broadcast')}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                view === 'broadcast' ? "bg-white text-black shadow-lg shadow-white/10" : "bg-zinc-900 text-zinc-500 hover:text-white"
              )}
             >
                System Broadcast
             </button>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="font-bold text-lg">
                {view === 'users' ? users.length : view === 'chats' ? conversations.length : music.length} 
                {view === 'users' ? ' Profiles' : view === 'chats' ? ' Channels' : ' Signals'}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            <input 
              type="text" 
              placeholder={`Search ${view}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
            {view === 'users' ? (
              <div className="overflow-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 border-b border-zinc-800 uppercase text-[10px] font-bold text-zinc-500 tracking-[0.2em] sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-6">Identity</th>
                      <th className="px-8 py-6">Graph</th>
                      <th className="px-8 py-6">Permissions</th>
                      <th className="px-8 py-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).map((user) => (
                      <tr key={user.uid} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-xl bg-zinc-800" alt="" />
                            <div>
                              <p className="font-bold text-sm">{user.displayName}</p>
                              <p className="text-xs text-zinc-500 italic">@{user.username} (ID: {user.uid.slice(0, 6)})</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                             <span>ING: {user.followingCount || 0}</span>
                             <span>ERS: {user.followersCount || 0}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                             user.role === 'developer' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-zinc-800 text-zinc-500"
                           )}>
                             {user.role}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => toggleVerify(user)}
                              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-indigo-400 rounded-xl transition-all"
                              title="Toggle Dev Status"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteUser(user.uid)}
                              className="p-2.5 bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-xl transition-all"
                              title="Erase Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : view === 'music' ? (
              <div className="overflow-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 border-b border-zinc-800 uppercase text-[10px] font-bold text-zinc-500 tracking-[0.2em] sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-6">Track Signal</th>
                      <th className="px-8 py-6">Uploader</th>
                      <th className="px-8 py-6">Protocol</th>
                      <th className="px-8 py-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {music.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.artist.toLowerCase().includes(search.toLowerCase())).map((track) => (
                      <tr key={track.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                               {track.albumArt ? (
                                 <img src={track.albumArt} className="w-full h-full object-cover" alt="" />
                               ) : (
                                 <Music className="w-5 h-5 text-indigo-400" />
                               )}
                            </div>
                            <div className="overflow-hidden">
                               <p className="font-bold text-sm truncate">{track.title}</p>
                               <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                             USER: {(track as any).addedBy?.slice(0, 8) || 'SYSTEM'}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                             ACTIVE
                           </span>
                        </td>
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => deleteMusic(track.id)}
                            className="p-2.5 bg-zinc-800 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
                            title="Purge Signal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : view === 'broadcast' ? (
              <div className="max-w-2xl mx-auto py-12 space-y-8">
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black flex items-center gap-2">
                       <Megaphone className="w-6 h-6 text-indigo-500" /> Global Uplink
                    </h3>
                    <p className="text-zinc-500 text-sm font-mono">Current active signals will appear for all users in real-time.</p>
                 </div>

                 <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-6">
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Signal Type</label>
                          <div className="flex gap-2">
                             {['info', 'warning', 'maintenance'].map(t => (
                               <button 
                                key={t}
                                onClick={() => setBroadcast({...broadcast, type: t})}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                  broadcast.type === t ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-white"
                                )}
                               >
                                  {t}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Message Payload</label>
                          <textarea 
                             value={broadcast.message}
                             onChange={e => setBroadcast({...broadcast, message: e.target.value})}
                             placeholder="Enter system announcement..."
                             className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-indigo-500 min-h-[120px]"
                          />
                       </div>
                    </div>
                    <button 
                       onClick={sendBroadcast}
                       disabled={!broadcast.message}
                       className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20"
                    >
                       INITIATE BROADCAST
                    </button>
                 </div>
              </div>
            ) : (
              <div className="p-8 space-y-4 overflow-auto">
                {conversations.filter(c => c.id.toLowerCase().includes(search.toLowerCase())).map(conv => (
                  <div key={conv.id} className="flex items-center justify-between p-6 bg-zinc-950/50 rounded-3xl border border-zinc-800 hover:border-indigo-500/30 group transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 relative">
                          <MessageSquare className="w-6 h-6 text-indigo-500" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">{conv.participants.length}</div>
                       </div>
                       <div>
                          <p className="font-bold text-sm tracking-tight">{conv.metadata?.name || 'PRIVATE_SESSION'}</p>
                          <p className="text-[10px] font-mono text-zinc-500 flex gap-2">
                            <span>UID_HASH: {conv.id.slice(0, 16)}...</span>
                            <span className="text-zinc-700">|</span>
                            <span>TYPE: {conv.type.toUpperCase()}</span>
                          </p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setViewingChat(conv)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                    >
                      <Eye className="w-4 h-4" />
                      Decrypt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                <Lock className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                 <ShieldAlert className="w-6 h-6" />
                 Ghost Protocols
              </h3>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                Enable administrative overrides to view all user communication and manage encrypted traffic flows. Only for emergency auditing.
              </p>
              <button 
                onClick={() => setView('chats')}
                className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
              >
                BROWSE ALL CHATS
              </button>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
              <h4 className="text-zinc-500 uppercase text-[10px] font-black tracking-widest mb-6">Real-time Logs</h4>
              <div className="space-y-4 font-mono text-[11px]">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex gap-4 p-3 bg-black/30 rounded-xl border border-zinc-800/50">
                       <span className="text-zinc-600">06:29:44</span>
                       <span className={cn("text-indigo-400", i%2===0 ? "text-amber-400" : "")}>{i%2===0 ? '[DB]' : '[AUTH]'}</span>
                       <span className="text-zinc-300">{i%2===0 ? 'Querying records...' : 'Security handshake OK'}</span>
                    </div>
                  ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
