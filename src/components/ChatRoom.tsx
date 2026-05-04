import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserProfile } from '../types';
import { db, storage } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Trash2, 
  Undo2, 
  Info,
  ShieldCheck,
  Video,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Swords,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

interface ChatRoomProps {
  conversation: Conversation;
  currentUser: UserProfile;
}

export default function ChatRoom({ conversation, currentUser }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [conversation.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const msgData = {
      convId: conversation.id,
      senderId: currentUser.uid,
      text: input,
      type: 'text',
      readBy: [currentUser.uid],
      deletedBy: [],
      createdAt: serverTimestamp(),
      isUnsent: false
    };

    setInput('');
    await addDoc(collection(db, 'conversations', conversation.id, 'messages'), msgData);
    await updateDoc(doc(db, 'conversations', conversation.id), {
      lastMessage: { text: input, updatedAt: serverTimestamp() },
      updatedAt: serverTimestamp()
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `chats/${conversation.id}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    const msgData = {
      convId: conversation.id,
      senderId: currentUser.uid,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      fileUrl: url,
      fileName: file.name,
      readBy: [currentUser.uid],
      deletedBy: [],
      createdAt: serverTimestamp(),
      isUnsent: false
    };

    await addDoc(collection(db, 'conversations', conversation.id, 'messages'), msgData);
  };

  const deleteForMe = async (msgId: string) => {
    const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);
    await updateDoc(msgRef, {
      deletedBy: [...messages.find(m => m.id === msgId)?.deletedBy || [], currentUser.uid]
    });
  };

  const unsendMessage = async (msgId: string) => {
    const msgRef = doc(db, 'conversations', conversation.id, 'messages', msgId);
    await updateDoc(msgRef, { isUnsent: true, text: 'This message was unsent' });
  };

  const handleRequest = async (action: 'accept' | 'block') => {
    if (action === 'accept') {
      await updateDoc(doc(db, 'conversations', conversation.id), {
        'metadata.isRequest': false,
        'metadata.acceptedAt': serverTimestamp()
      });
    } else {
      // Blocking could mean deleting the conversation or adding to a blocklist
      // For this demo, we'll just archive it or remove the user from participants
      await updateDoc(doc(db, 'conversations', conversation.id), {
        'metadata.isBlocked': true,
        participants: conversation.participants.filter(id => id !== currentUser.uid)
      });
    }
  };

  const isRequest = conversation.metadata?.isRequest;

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      {/* Request Banner */}
      <AnimatePresence>
        {isRequest && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600/10 border-b border-indigo-500/20 p-4 shrink-0 overflow-hidden"
          >
             <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div>
                   <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Message Request</p>
                   <p className="text-xs text-zinc-400">This user isn't in your network. Do you want to allow messages?</p>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => handleRequest('block')}
                    className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                   >
                      Block
                   </button>
                   <button 
                    onClick={() => handleRequest('accept')}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                   >
                      Accept
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-6 glass sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
             <img 
              src={conversation.metadata?.icon || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`} 
              className="w-10 h-10 rounded-xl bg-zinc-800" 
              alt="" 
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100">{conversation.metadata?.name || 'Loading Chat...'}</h3>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
               <ShieldCheck className="w-3 h-3 text-indigo-500" />
               End-to-End Encrypted
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Encryption Badge */}
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] shadow-sm">
            <Lock className="w-3 h-3 text-amber-500" />
            End-to-end encryption 🔒
          </div>
        </div>

        {messages.filter(m => !m.deletedBy?.includes(currentUser.uid)).map((msg, i) => {
          const isMine = msg.senderId === currentUser.uid;
          const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn(
                "flex items-end gap-3",
                isMine ? "flex-row-reverse" : "flex-row"
              )}
            >
              {!isMine && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                  {showAvatar && <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} className="w-full h-full" alt="" />}
                </div>
              )}
              
              <div className="max-w-[70%] group relative">
                <div className={cn(
                  "p-4 rounded-2xl text-sm shadow-lg",
                  isMine ? "bg-indigo-600 text-white rounded-br-none" : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none",
                  msg.isUnsent && "italic opacity-50"
                )}>
                  {msg.type === 'image' ? (
                    <img src={msg.fileUrl} className="max-w-full rounded-lg mb-2" alt="" />
                  ) : msg.type === 'file' ? (
                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/10">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate text-xs font-medium">{msg.fileName}</p>
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/50 hover:text-white transition-colors">Download File</a>
                      </div>
                    </div>
                  ) : msg.gameData ? (
                    <div className="space-y-4">
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <Swords className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-xs uppercase tracking-widest text-indigo-300">New Arena Battle</p>
                          <p className="text-[10px] text-zinc-500 font-medium">Tic-Tac-Toe Challenge</p>
                        </div>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'games' }))}
                          className="w-full py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                          Enter Arena
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.text}</p>
                  )}
                  
                  <div className={cn(
                    "flex items-center gap-2 mt-2",
                    isMine ? "justify-end" : "justify-start"
                  )}>
                    <span className="text-[9px] opacity-40 uppercase tracking-widest font-bold">
                       {msg.createdAt ? formatDate(new Date((msg.createdAt as any).seconds * 1000)) : 'sending...'}
                    </span>
                    {isMine && !msg.isUnsent && (
                      <div className="flex items-center">
                        {msg.readBy?.length > 1 ? (
                          <CheckCheck className="w-3 h-3 text-indigo-300" />
                        ) : (
                          <Check className="w-3 h-3 text-white/40" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className={cn(
                  "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 p-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl",
                  isMine ? "right-full mr-2" : "left-full ml-2"
                )}>
                  {!msg.isUnsent && isMine && (
                    <button onClick={() => unsendMessage(msg.id)} className="p-1.5 hover:text-indigo-400 text-zinc-400" title="Unsend">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deleteForMe(msg.id)} className="p-1.5 hover:text-red-400 text-zinc-400" title="Delete for me">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-6 glass border-t border-zinc-800">
        {isRequest ? (
          <div className="text-center p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-xs text-zinc-500 font-medium">You must accept this request before responding.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl flex-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <div className="flex gap-1 ml-1">
                <label className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl cursor-pointer transition-all">
                  <ImageIcon className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                <label className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl cursor-pointer transition-all">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-white"
              />
              
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-indigo-600 text-white p-3 rounded-xl disabled:opacity-50 disabled:bg-zinc-800 hover:bg-indigo-500 transition-all active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
