import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  Swords, 
  Sparkles,
  RefreshCw,
  X,
  Circle,
  Search,
  Send,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, limit, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { UserProfile } from '../types';

export default function GamesHub() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (showInviteModal) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, 'users'), limit(10));
          const snapshot = await getDocs(q);
          setUsers(snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid));
        } catch (err) {
          console.error("Fetch users error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [showInviteModal]);

  const sendChallenge = async (targetUser: UserProfile) => {
    if (!auth.currentUser) return;
    setInviting(targetUser.uid);
    try {
      // Find or create conversation
      const convsQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const convsSnap = await getDocs(convsQ);
      let convId = '';
      
      const existingConv = convsSnap.docs.find(doc => {
        const data = doc.data();
        return data.type === 'private' && data.participants.includes(targetUser.uid);
      });

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const newConv = await addDoc(collection(db, 'conversations'), {
          participants: [auth.currentUser.uid, targetUser.uid],
          type: 'private',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: {
            text: 'Challenge Issued!',
            senderId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          }
        });
        convId = newConv.id;
      }

      // Send the challenge message
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        convId,
        senderId: auth.currentUser.uid,
        text: `Hey! I challenge you to a game of Tic-Tac-Toe in the Arena! ⚔️`,
        type: 'challenge',
        gameData: { type: 'tictactoe', invitedBy: auth.currentUser.uid },
        createdAt: serverTimestamp(),
        readBy: [auth.currentUser.uid],
        deletedBy: []
      });

      setShowInviteModal(false);
      alert(`Challenge sent to ${targetUser.displayName}!`);
    } catch (err) {
      console.error("Challenge error:", err);
      alert("Failed to send challenge.");
    } finally {
      setInviting(null);
    }
  };

  const calculateWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const nextBoard = [...board];
    nextBoard[i] = isXNext ? 'X' : 'O';
    setBoard(nextBoard);
    setIsXNext(!isXNext);
    const win = calculateWinner(nextBoard);
    if (win) setWinner(win);
    else if (!nextBoard.includes(null)) setWinner('Draw');
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  const Square = ({ i }: { i: number, key?: React.Key }) => (
    <button
      onClick={() => handleClick(i)}
      className={cn(
        "aspect-square rounded-2xl flex items-center justify-center text-4xl font-black transition-all",
        board[i] ? "bg-zinc-800 scale-95" : "bg-zinc-900 hover:bg-zinc-800 cursor-pointer",
        board[i] === 'X' ? "text-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
      )}
    >
      {board[i] === 'X' && <X className="w-12 h-12" />}
      {board[i] === 'O' && <Circle className="w-10 h-10" />}
    </button>
  );

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto relative">
      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] glass flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl shadow-black"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tighter text-lg">Select Opponent</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search nexus database..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 no-scrollbar">
                  {loading ? (
                    <div className="py-12 text-center text-zinc-600 font-mono text-xs animate-pulse">Scanning frequencies...</div>
                  ) : users.filter(u => u.username.includes(search.toLowerCase())).map(user => (
                    <div key={user.uid} className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 rounded-xl bg-zinc-800" alt="" />
                        <div>
                          <p className="text-sm font-bold">{user.displayName}</p>
                          <p className="text-[10px] text-zinc-500 italic">@{user.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendChallenge(user)}
                        disabled={inviting === user.uid}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50"
                      >
                        {inviting === user.uid ? 'Sending...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                  {users.length === 0 && !loading && <div className="text-center py-8 text-zinc-600 text-xs">No active signals found.</div>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 uppercase tracking-tighter italic">Nexus Discovery</h2>
          <p className="text-zinc-500 font-medium">Explore trending transmissions and global interactions</p>
        </div>
        <div className="flex gap-4">
           <button 
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
           >
              <UserPlus className="w-4 h-4" />
              Challenge Friend
           </button>
           <div className="px-5 py-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl flex items-center gap-2 font-bold text-sm">
              <Trophy className="w-4 h-4" />
              Rank #42
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Game Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
                    <Swords className="text-white w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-xl uppercase tracking-tighter">Tic-Tac-Toe</h3>
                    <p className="text-xs text-zinc-500 font-mono">VS Local Play</p>
                 </div>
              </div>
              <button 
                onClick={resetGame}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
           </div>

           <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto p-4 bg-zinc-950/50 rounded-[2.5rem] border border-zinc-800">
             {[0,1,2,3,4,5,6,7,8].map(i => <Square key={i} i={i} />)}
           </div>

           <div className="mt-8 text-center bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800">
              <AnimatePresence mode="wait">
                {winner ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                     <Sparkles className="w-6 h-6 text-yellow-500 mb-1" />
                     <p className="font-black text-2xl uppercase tracking-widest text-indigo-400">
                        {winner === 'Draw' ? "It's a Draw!" : `${winner} WINS!`}
                     </p>
                     <p className="text-xs text-zinc-500 uppercase tracking-[0.3em]">Match Over</p>
                  </motion.div>
                ) : (
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                     Turn: <span className={isXNext ? "text-indigo-500" : "text-rose-500"}>{isXNext ? 'X' : 'O'}</span>
                  </p>
                )}
              </AnimatePresence>
           </div>
        </div>

        {/* Categories / Leaderboard */}
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-indigo-500/50 transition-all group">
                 <Gamepad2 className="w-8 h-8 text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
                 <p className="font-bold">Retro Mix</p>
                 <p className="text-xs text-zinc-500 mt-1">12 Classic games</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-violet-500/50 transition-all group">
                 <Users className="w-8 h-8 text-violet-500 mb-4 group-hover:scale-110 transition-transform" />
                 <p className="font-bold">Multiplayer</p>
                 <p className="text-xs text-zinc-500 mt-1">8 Party games</p>
              </div>
           </div>

           <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8">
              <h4 className="text-zinc-500 uppercase text-[10px] font-black tracking-widest mb-8 flex items-center gap-2">
                 <Trophy className="w-3 h-3" /> Global Leaderboard
              </h4>
              <div className="space-y-4">
                 {[1,2,3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800 group hover:border-indigo-500/30 transition-all">
                       <div className="flex items-center gap-4">
                          <span className="text-zinc-600 font-black italic">#{i}</span>
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700">
                             <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=p${i}`} alt="" />
                          </div>
                          <span className="font-bold text-sm">Player_{i}</span>
                       </div>
                       <span className="font-black text-indigo-500 text-sm">{4000 - (i * 250)} XP</span>
                    </div>
                 ))}
              </div>
              <button className="w-full mt-8 py-4 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                 View All Rankings
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
