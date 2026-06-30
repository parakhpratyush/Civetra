import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Upload, Shield } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signOut, getAdditionalUserInfo, deleteUser } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTheme } from '../ThemeContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { id: 'male', label: 'Male', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { id: 'female', label: 'Female', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia' },
  { id: 'neutral', label: 'Prefer not to say', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }
];

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0].url);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError("You do not have an account on this website. Create an account.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if admin
        const adminRef = collection(db, 'admin');
        const q = query(adminRef, where('email', '==', user.email));
        const adminSnap = await getDocs(q);
        
        if (adminSnap.empty) {
          const { getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await signOut(auth);
            setError("Create account. You don't have an account in this.");
            setLoading(false);
            return;
          }
        }

        onClose();
        if (!adminSnap.empty) {
          navigate('/c-admin');
        }
      } else {
        let user;
        let isPreProvisionedAdmin = false;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              user = userCredential.user;
              const { getDoc } = await import('firebase/firestore');
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                await signOut(auth);
                setError("You already have an account. Login using that.");
                setLoading(false);
                return;
              }
            } catch (innerE: any) {
              if (innerE.code === 'auth/wrong-password') {
                setError("You already have an account but entered the wrong password. Login using that.");
                setLoading(false);
                return;
              }
              throw innerE;
            }
          } else {
            throw e;
          }
        }
        
        // Check if admin
        const adminRef = collection(db, 'admin');
        const q = query(adminRef, where('email', '==', user.email));
        const adminSnap = await getDocs(q);
        isPreProvisionedAdmin = !adminSnap.empty;
        
        if (!isPreProvisionedAdmin) {
          // Create user document in Firestore
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: name || 'Citizen',
            avatar: customAvatarUrl || avatar,
            role: 'user', // Default role
            badges: [],
            certificates: [],
            createdAt: Date.now()
          }, { merge: true });
        }
        onClose();
        if (isPreProvisionedAdmin) {
          navigate('/c-admin');
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      if (auth.currentUser) await signOut(auth);
      
      let customError = 'Authentication failed. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        customError = 'You do not have an account on this website. Create an account.';
      } else if (err.code === 'auth/email-already-in-use') {
        customError = 'You already have an account. Login using that.';
      } else if (err.code === 'auth/weak-password') {
        customError = 'Your password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        customError = 'The email address is invalid.';
      } else if (err.code === 'permission-denied') {
        customError = 'Authentication failed. Please check your Firestore Rules.';
      }
      
      setError(customError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const additionalInfo = getAdditionalUserInfo(userCredential);
      
      // Check if admin
      const adminRef = collection(db, 'admin');
      const q = query(adminRef, where('email', '==', user.email));
      const adminSnap = await getDocs(q);
      const isPreProvisionedAdmin = !adminSnap.empty;
      
      if (isLogin) {
        // User is on "Sign In" tab. They must already have an account OR be an admin.
        if (additionalInfo?.isNewUser && !isPreProvisionedAdmin) {
          // It's a brand new account, meaning they didn't exist before.
          await deleteUser(user); // Destroy the accidentally created account
          await signOut(auth);
          setError("Create account. You don't have an account in this.");
          setLoading(false);
          return;
        } else if (!isPreProvisionedAdmin) {
          const { getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await signOut(auth);
            setError("Create account. You don't have an account in this.");
            setLoading(false);
            return;
          }
        }
      } else {
        // User is on "Create Account" tab.
        let shouldCreateDoc = additionalInfo?.isNewUser;
        if (!additionalInfo?.isNewUser && !isPreProvisionedAdmin) {
          const { getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            await signOut(auth);
            setError("You already have an account. Login using that.");
            setLoading(false);
            return;
          } else {
            shouldCreateDoc = true;
          }
        }
        
        if (shouldCreateDoc && !isPreProvisionedAdmin) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Citizen',
            avatar: user.photoURL || PRESET_AVATARS[0].url,
            role: 'user', // Default role
            badges: [],
            certificates: [],
            createdAt: Date.now()
          }, { merge: true });
        }
      }
      
      onClose();
      
      if (isPreProvisionedAdmin) {
        navigate('/c-admin');
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (auth.currentUser) await signOut(auth);
      
      let customError = 'Google Authentication failed. Please try again.';
      if (err.code === 'auth/account-exists-with-different-credential') {
        customError = 'You already have an account. Login using that.';
      } else if (err.code === 'permission-denied') {
        customError = 'Google Authentication failed. Please check your Firestore Rules.';
      }
      
      setError(customError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl min-h-[500px] flex rounded-3xl shadow-2xl z-[101] border overflow-hidden ${isDark ? 'bg-[#08080c] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}
          >
            {/* Left Branding Pane - Hidden on mobile */}
            <div className={`hidden md:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden border-r ${isDark ? 'bg-[#111] border-white/10' : 'bg-gray-50 border-black/10'}`}>
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <Shield className={`w-12 h-12 mb-6 ${isDark ? 'text-white' : 'text-black'}`} />
                <h2 className="text-4xl font-serif italic mb-4">Civetra.</h2>
                <p className={`text-sm tracking-widest uppercase font-bold leading-relaxed ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                  Empowering Citizens.<br />
                  Transforming Communities.
                </p>
              </div>
              <div className="relative z-10">
                <div className={`p-6 rounded-2xl border backdrop-blur-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <p className={`text-xs font-medium italic ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                    "A community is built not by its infrastructure, but by the active participation of its people."
                  </p>
                </div>
              </div>
            </div>

            {/* Right Form Pane */}
            <div className="w-full md:w-1/2 p-8 md:p-12 relative max-h-[85vh] overflow-y-auto no-scrollbar">
              <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-10 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
                <X className="w-5 h-5" />
              </button>

            <div className="mb-8 pt-4">
              <h2 className="text-2xl font-bold font-serif mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                {isLogin ? 'Sign in to manage your reports and track your civic impact.' : 'Join the community to start reporting and volunteering.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold tracking-widest uppercase mb-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Full Name</label>
                    <div className="relative">
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 placeholder:text-white/30' : 'bg-white border-black/10 focus:border-black/30 placeholder:text-black/30'}`}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold tracking-widest uppercase mb-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Select Avatar</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {PRESET_AVATARS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => { setAvatar(preset.url); setCustomAvatarUrl(''); }}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${avatar === preset.url && !customAvatarUrl ? (isDark ? 'border-white bg-white/10' : 'border-black bg-black/5') : (isDark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30')}`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-8 h-8 rounded-full mb-2 bg-white" />
                          <span className={`text-[10px] font-bold text-center ${isDark ? 'text-white/70' : 'text-black/70'}`}>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Upload className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                      <input 
                        type="url" 
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-colors text-xs ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 placeholder:text-white/30' : 'bg-white border-black/10 focus:border-black/30 placeholder:text-black/30'}`}
                        placeholder="Or paste custom image URL..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-xs font-bold tracking-widest uppercase mb-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Email Address</label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 placeholder:text-white/30' : 'bg-white border-black/10 focus:border-black/30 placeholder:text-black/30'}`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold tracking-widest uppercase mb-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Password</label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 placeholder:text-white/30' : 'bg-white border-black/10 focus:border-black/30 placeholder:text-black/30'}`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold tracking-widest uppercase text-xs transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center space-x-4">
              <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
              <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Or</span>
              <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full mt-6 py-4 rounded-xl font-bold tracking-widest uppercase text-xs transition-all border flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-black border-white/20 hover:bg-white/5' : 'bg-white border-black/20 hover:bg-black/5'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="mt-8 text-center">
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className={`font-bold transition-colors ${isDark ? 'text-white hover:text-amber-500' : 'text-black hover:text-amber-600'}`}
                >
                  {isLogin ? 'Create Account' : 'Sign In'}
                </button>
              </p>
            </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
