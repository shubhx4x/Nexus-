/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Messenger from './components/Messenger';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setConnectionError(true);
      }, 15000); // 15s timeout
      return () => clearTimeout(timer);
    } else {
      setConnectionError(false);
    }
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsub = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // Attempt to create profile if it doesn't exist (e.g. signup failed previously)
          console.log("Profile not found, attempting auto-creation...");
          const baseUsername = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user' + Math.floor(Math.random() * 1000);
          try {
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email,
              username: baseUsername,
              displayName: user.displayName || baseUsername,
              photoURL: user.photoURL || '',
              role: user.email === 'gamechangers4200@gmail.com' ? 'developer' : 'user',
              isPrivate: false,
              dndMode: false,
              status: 'online',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              followersCount: 0,
              followingCount: 0
            });
            await setDoc(doc(db, 'usernames', baseUsername), { uid: user.uid });
          } catch (e) {
            console.error("Auto-profile creation failed:", e);
          }
          setProfile(null); // Will be picked up by the next snapshot or stays null
        }
        setLoading(false);
      }, (err) => {
        console.error("Profile fetch error:", err);
        setLoading(false);
      });

      // Presence management
      updateDoc(doc(db, 'users', user.uid), {
        status: 'online',
        lastSeen: new Date().toISOString()
      }).catch(e => console.warn("Presence update failed:", e));

      const handleVisibility = () => {
        if (!user?.uid) return;
        const status = document.visibilityState === 'visible' ? 'online' : 'away';
        updateDoc(doc(db, 'users', user.uid), {
          status,
          lastSeen: new Date().toISOString()
        }).catch(() => {});
      };

      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        unsub();
        document.removeEventListener('visibilitychange', handleVisibility);
        if (auth.currentUser && user?.uid) {
           updateDoc(doc(db, 'users', user.uid), {
            status: 'offline',
            lastSeen: new Date().toISOString()
          }).catch(() => {});
        }
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-8 max-w-xs">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          />
          <div className="space-y-4">
             <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Establishing Nexus Link...</p>
             {connectionError && (
               <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-4"
               >
                  <p className="text-rose-400 text-xs font-medium">Link response delayed. This might be due to server sync or network congestion.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white hover:bg-zinc-800 transition-all uppercase tracking-widest"
                  >
                    Attempt Re-Link
                  </button>
               </motion.div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(profile?.themeColor || 'theme-indigo', profile?.interfaceMode ? `mode-${profile.interfaceMode}` : 'mode-nexus')}>
      <AnimatePresence mode="wait">
        {!user ? (
          <Auth key="auth" />
        ) : profile ? (
          <Layout profile={profile}>
             <Messenger profile={profile} />
          </Layout>
        ) : (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
             <div className="max-w-xs space-y-6">
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                   <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="space-y-2">
                   <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Initializing Profile</h2>
                   <p className="text-zinc-500 text-xs leading-relaxed">
                      We're synchronizing your records with the Nexus database. This typically takes a few seconds.
                   </p>
                </div>
                <div className="pt-4 space-y-3">
                   <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Connection Status: Latency Detected</p>
                   <button 
                    onClick={() => window.location.reload()}
                    className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                   >
                      Force Re-Sync
                   </button>
                   <div className="h-px bg-zinc-900 w-full" />
                   <button 
                    onClick={() => signOut(auth)}
                    className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:text-zinc-400 transition-colors"
                   >
                      Abort Session
                   </button>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
