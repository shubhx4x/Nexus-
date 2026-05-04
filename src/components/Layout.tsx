import React from 'react';
import { UserProfile } from '../types';
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Play, 
  Shield, 
  LogOut,
  Bell,
  Search,
  User,
  Sparkles,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import CreatePost from './CreatePost';
import UserProfileView from './UserProfileView';
import ProfileSettings from './ProfileSettings';
import { Megaphone, X as XIcon } from 'lucide-react';
import { APP_NAME, Logo } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
}

export default function Layout({ children, profile }: LayoutProps) {
  const [activeTab, setActiveTab] = React.useState('home');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<any>(null);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Status update failed:", e);
      }
    }
    await signOut(auth);
  };


  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'announcements'), 
      where('active', '==', true),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setAnnouncement({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setAnnouncement(null);
      }
    }, (err) => {
      handleFirestoreError(err, 'get', 'announcements');
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  React.useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail === 'create') {
        setShowCreate(true);
      } else if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  const navItems = [
    { id: 'home', icon: Shield, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Messages' },
    { id: 'games', icon: Sparkles, label: 'Discover' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  if (profile?.role === 'developer') {
    navItems.splice(1, 0, { id: 'admin', icon: ShieldAlert, label: 'Admin' });
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden font-sans text-zinc-100">
      <AnimatePresence>
        {announcement && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] p-4 pointer-events-none"
          >
            <div className="max-w-xl mx-auto bg-indigo-600/90 backdrop-blur-xl border border-indigo-400/30 rounded-3xl p-4 pointer-events-auto flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">System Broadcast</p>
                  <p className="text-xs font-bold text-white pr-4">{announcement.message}</p>
                </div>
              </div>
              <button 
                onClick={() => setAnnouncement(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="h-16 px-6 border-b border-zinc-800 flex items-center justify-between glass z-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Logo className="w-5 h-5 text-white" />
          </div>
          <span className="font-black tracking-tighter text-lg uppercase italic">{APP_NAME}</span>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all relative"
            >
              <Bell className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-4 z-[100]"
                >
                   <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 px-2">Recent Alerts</h4>
                   <div className="space-y-2 max-h-96 overflow-y-auto">
                      <div className="py-8 px-4 text-center">
                         <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6 text-zinc-700" />
                         </div>
                         <p className="text-xs font-bold text-zinc-400">All caught up!</p>
                         <p className="text-[10px] text-zinc-600 mt-1">No new transmissions detected in the Nexus.</p>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-1.5 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
              className="w-8 h-8 rounded-lg object-cover"
              alt=""
            />
            <LogOut className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </header>

      {/* PWA Install Promo */}
      <AnimatePresence>
        {deferredPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:w-80"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                     <Plus className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                     <p className="text-xs font-bold text-white">Install {APP_NAME}</p>
                     <p className="text-[10px] text-zinc-500">Access the network from your home screen.</p>
                  </div>
               </div>
               <button 
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-wider rounded-lg shrink-0"
               >
                 Install
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden bg-zinc-950">
        {React.Children.map(children, child => {
           if (React.isValidElement(child)) {
             return React.cloneElement(child as React.ReactElement<any>, { activeTab });
           }
           return child;
        })}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-20 border-t border-zinc-800 glass flex items-center justify-around px-4 shrink-0 z-50">
        {navItems.slice(0, Math.ceil(navItems.length / 2)).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all p-2 rounded-2xl min-w-[64px]",
              activeTab === item.id ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              activeTab === item.id ? "bg-indigo-500/10" : ""
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}

        {/* Central Create Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="relative -top-6 flex items-center justify-center p-4 bg-indigo-600 rounded-[2rem] shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-95 transition-all group border-4 border-black"
        >
          <Plus className="w-8 h-8 text-white group-hover:rotate-90 transition-transform" />
        </button>

        {navItems.slice(Math.ceil(navItems.length / 2)).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all p-2 rounded-2xl min-w-[64px]",
              activeTab === item.id ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              activeTab === item.id ? "bg-indigo-500/10" : ""
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && profile && (
          <CreatePost 
            profile={profile} 
            onClose={() => setShowCreate(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
