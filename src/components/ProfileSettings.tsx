import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, storage, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Camera, 
  Save, 
  User, 
  AtSign, 
  FileText, 
  Palette, 
  Eye, 
  EyeOff,
  Moon,
  Sun,
  ShieldAlert,
  ChevronLeft,
  Check,
  Lock,
  Globe,
  CameraIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ProfileSettingsProps {
  profile: UserProfile;
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || '');
  const [theme, setTheme] = useState(profile.themeColor || 'theme-indigo');
  const [mode, setMode] = useState<UserProfile['interfaceMode']>(profile.interfaceMode || 'nexus');
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate);
  const [isDnd, setIsDnd] = useState(profile.dndMode);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const themes = [
    { id: 'theme-indigo', color: '#6366f1', name: 'Indigo' },
    { id: 'theme-rose', color: '#f43f5e', name: 'Rose' },
    { id: 'theme-emerald', color: '#10b981', name: 'Emerald' },
    { id: 'theme-amber', color: '#f59e0b', name: 'Amber' },
    { id: 'theme-violet', color: '#8b5cf6', name: 'Violet' },
  ];

  const modes = [
    { id: 'nexus', name: 'Nexus', desc: 'Futuristic & Bold' },
    { id: 'minimal', name: 'Minimal', desc: 'Clean & Modern' },
    { id: 'cyber', name: 'Cyber', desc: 'Neon & High Contrast' },
  ] as const;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        bio,
        themeColor: theme,
        interfaceMode: mode,
        isPrivate,
        dndMode: isDnd,
        updatedAt: serverTimestamp()
      });
      console.log('Profile updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: url,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid} (avatar)`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-y-auto no-scrollbar">
      {/* Mobile-Style Header */}
      <div className="sticky top-0 z-10 px-6 h-16 bg-black/80 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Edit Profile</h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-indigo-400 hover:text-indigo-300 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
          ) : (
            'Done'
          )}
        </button>
      </div>

      <div className="max-w-xl mx-auto w-full px-6 py-10 space-y-12 pb-32">
        {/* Avatar Section: Instagram Inspired */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600">
               <div className="w-full h-full rounded-full bg-black p-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border border-white/10 group relative">
                    <img 
                      src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} 
                      className={cn("w-full h-full object-cover transition-all duration-500", uploading && "opacity-50 scale-110 blur-sm")}
                      alt="" 
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin shadow-2xl" />
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
          <label className="cursor-pointer group">
            <span className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors">
              Change profile photo
            </span>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={uploading} />
          </label>
        </div>

        {/* Input Fields: Clean & Minimal */}
        <div className="space-y-8">
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Name</label>
              <div className="relative group">
                 <input
                   type="text"
                   value={displayName}
                   onChange={(e) => setDisplayName(e.target.value)}
                   className="w-full bg-transparent border-b border-zinc-800 py-3 px-1 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-700"
                   placeholder="Your public name"
                 />
                 <User className="absolute right-2 top-3 w-4 h-4 text-zinc-700 group-focus-within:text-indigo-500 transition-colors" />
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Username</label>
              <div className="relative group opacity-50 cursor-not-allowed">
                 <input
                   type="text"
                   value={profile.username}
                   readOnly
                   className="w-full bg-transparent border-b border-zinc-800 py-3 px-1 text-sm font-bold text-zinc-500 focus:outline-none"
                 />
                 <AtSign className="absolute right-2 top-3 w-4 h-4 text-zinc-700" />
              </div>
              <p className="text-[9px] text-zinc-600 font-medium px-1 italic">Username handle is core-encrypted and cannot be changed.</p>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Bio</label>
                 <span className={cn("text-[9px] font-black tracking-widest", bio.length > 150 ? "text-rose-500" : "text-zinc-600")}>
                    {bio.length}/150
                 </span>
              </div>
              <div className="relative group">
                 <textarea
                   value={bio}
                   onChange={(e) => setBio(e.target.value.slice(0, 150))}
                   rows={3}
                   placeholder="Enter your transmission cipher..."
                   className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-zinc-700"
                 />
                 <FileText className="absolute right-3 top-4 w-4 h-4 text-zinc-700 group-focus-within:text-indigo-500 transition-colors" />
              </div>
           </div>
        </div>

        {/* Action Toggles */}
        <div className="space-y-4 pt-8">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1 mb-4">Privacy & Safety</h3>
           <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] divide-y divide-zinc-800/50">
              <div className="p-6 flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isPrivate ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"
                    )}>
                       {isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-tighter">Private Account</p>
                       <p className="text-[10px] text-zinc-600 mt-0.5">Restrict neural access to approved users only.</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    isPrivate ? "bg-indigo-600" : "bg-zinc-800"
                  )}
                 >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      isPrivate ? "left-6" : "left-1"
                    )} />
                 </button>
              </div>

              <div className="p-6 flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      isDnd ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                       <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-tighter">Ghost Mode</p>
                       <p className="text-[10px] text-zinc-600 mt-0.5">Hide your online status and active signals.</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setIsDnd(!isDnd)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    isDnd ? "bg-indigo-600" : "bg-zinc-800"
                  )}
                 >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      isDnd ? "left-6" : "left-1"
                    )} />
                 </button>
              </div>
           </div>
        </div>

        {/* Visual Customization */}
        <div className="space-y-8 pt-4">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Interface Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {modes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                        mode === m.id 
                          ? "bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/20" 
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                       <div className={cn(
                         "text-[10px] font-black uppercase tracking-widest",
                         mode === m.id ? "text-indigo-100" : "text-zinc-400"
                       )}>{m.name}</div>
                       <p className={cn(
                         "text-[10px] mt-1",
                         mode === m.id ? "text-white/70" : "text-zinc-600"
                       )}>{m.desc}</p>
                       {mode === m.id && (
                         <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Check className="w-4 h-4 text-white" />
                         </div>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">Accent Signature</h3>
              <div className="flex gap-3 justify-between p-2 bg-zinc-900/40 border border-zinc-800 rounded-[2rem]">
                 {themes.map(t => (
                   <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                       "flex-1 h-12 rounded-2xl transition-all relative overflow-hidden group",
                       theme === t.id ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-40 hover:opacity-100"
                    )}
                   >
                      <div className="absolute inset-0" style={{ backgroundColor: t.color }} />
                      {theme === t.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                           <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <button 
          onClick={() => auth.signOut()}
          className="w-full py-4 text-xs font-black uppercase tracking-[0.3em] text-rose-500 hover:text-rose-400 transition-colors pt-8"
        >
          Deactivate Session
        </button>
      </div>
    </div>
  );
}
