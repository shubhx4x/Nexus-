import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, LogIn, UserPlus, Key, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeveloperLogin, setIsDeveloperLogin] = useState(false);

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('Recaptcha resolved');
      }
    });
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (!confirmationResult) {
        setupRecaptcha();
        const verifier = (window as any).recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        setConfirmationResult(result);
      } else {
        const result = await confirmationResult.confirm(otp);
        const user = result.user;
        
        // Handle profile creation for phone user
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          const baseUsername = 'user_' + phoneNumber.slice(-4) + Math.floor(Math.random() * 100);
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            username: baseUsername,
            displayName: baseUsername,
            role: 'user',
            isPrivate: false,
            dndMode: false,
            status: 'online',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            followersCount: 0,
            followingCount: 0
          });
          await setDoc(doc(db, 'usernames', baseUsername), { uid: user.uid });
        }
      }
    } catch (err: any) {
      setError(err.message);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please check the code sent to your device.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create basic profile
        const baseUsername = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user' + Math.floor(Math.random() * 1000);
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: baseUsername,
          displayName: user.displayName || baseUsername,
          photoURL: user.photoURL || '',
          role: 'user',
          isPrivate: false,
          dndMode: false,
          status: 'online',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          followersCount: 0,
          followingCount: 0
        });
        await setDoc(doc(db, 'usernames', baseUsername), { uid: user.uid });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Check username uniqueness
        const usernameDoc = await getDoc(doc(db, 'usernames', username));
        if (usernameDoc.exists()) {
          throw new Error('Username already taken');
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username,
          displayName: username,
          role: 'user',
          isPrivate: false,
          dndMode: false,
          status: 'online',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          followersCount: 0,
          followingCount: 0
        });
        await setDoc(doc(db, 'usernames', username), { uid: user.uid });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === '@imdeveloper' && password === '@imdeveloper9615') {
       setLoading(true);
       try {
         // Special case: we sign them in with a fixed developer email
         const devEmail = 'developer@nexus.app';
         // Check if this dev user exists, if not create
         let user;
         try {
           const result = await signInWithEmailAndPassword(auth, devEmail, password);
           user = result.user;
         } catch {
           const result = await createUserWithEmailAndPassword(auth, devEmail, password);
           user = result.user;
           await setDoc(doc(db, 'users', user.uid), {
             uid: user.uid,
             email: devEmail,
             username: 'imdeveloper',
             displayName: 'Nexus Developer',
             role: 'developer',
             isPrivate: false,
             dndMode: false,
             status: 'online',
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
             followersCount: 0,
             followingCount: 0
           });
           await setDoc(doc(db, 'usernames', 'imdeveloper'), { uid: user.uid });
         }
       } catch (err: any) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
    } else {
      setError("Invalid developer credentials");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4">
             <button 
              onClick={() => setIsDeveloperLogin(!isDeveloperLogin)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Developer Login"
             >
                <Key className="w-5 h-5" />
             </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isDeveloperLogin ? 'Dev Panel' : (isLogin ? 'Welcome Back' : 'Create Account')}
            </h1>
            <p className="text-zinc-400">
              {isDeveloperLogin ? 'Secure access for developers only' : 'The ultimate messaging experience'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {!isDeveloperLogin && (
            <div className="flex bg-zinc-800/50 p-1 rounded-2xl mb-6">
               <button 
                onClick={() => setAuthMethod('email')}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  authMethod === 'email' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
               >
                 Neural ID
               </button>
               <button 
                onClick={() => setAuthMethod('phone')}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  authMethod === 'phone' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
               >
                 Frequency
               </button>
            </div>
          )}

          {authMethod === 'phone' && !isDeveloperLogin ? (
            <form onSubmit={handlePhoneAuth} className="space-y-4">
               {!confirmationResult ? (
                 <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 ml-2 font-semibold">Phone Frequency</label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="+1 234 567 8900"
                    />
                    <p className="text-[10px] text-zinc-500 ml-2">Include country code (+XX)</p>
                 </div>
               ) : (
                 <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 ml-2 font-semibold italic">Verification Response (OTP)</label>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all tracking-[1em] text-center font-bold text-xl"
                      placeholder="000000"
                      maxLength={6}
                    />
                 </div>
               )}
               <div id="recaptcha-container"></div>
               <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {confirmationResult ? <ShieldCheck className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                      {confirmationResult ? 'Verify Transmission' : 'Send Pulse'}
                    </>
                  )}
                </button>
                {confirmationResult && (
                  <button 
                    type="button" 
                    onClick={() => { setConfirmationResult(null); setOtp(''); }}
                    className="w-full text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors py-2"
                  >
                    Resend Pulse
                  </button>
                )}
            </form>
          ) : (
            <form onSubmit={isDeveloperLogin ? handleDevLogin : handleEmailAuth} className="space-y-4">
            {!isLogin && !isDeveloperLogin && (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-zinc-500 ml-2 font-semibold">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="choose_a_name"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 ml-2 font-semibold">
                {isDeveloperLogin ? 'Dev ID' : 'Email Address'}
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder={isDeveloperLogin ? "@id" : "you@example.com"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 ml-2 font-semibold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isDeveloperLogin ? 'Access Console' : (isLogin ? 'Sign In' : 'Join Now')}
                </>
              )}
            </button>
          </form>
          )}

          {!isDeveloperLogin && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-2xl transition-all border border-zinc-700"
                >
                  <Mail className="w-5 h-5" />
                  Google
                </button>
                <button className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-2xl transition-all border border-zinc-700 opacity-50 cursor-not-allowed">
                  <Github className="w-5 h-5" />
                  Github
                </button>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </>
          )}
          
          {isDeveloperLogin && (
            <div className="mt-8 text-center text-xs text-zinc-600">
               Note: Developer login grants administrative access to all records.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
