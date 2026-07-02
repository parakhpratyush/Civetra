import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import { User, Mail, Award, FileBadge, Trash2, Camera, LogOut, Loader2, Shield, Upload, Medal, Star, Download } from 'lucide-react';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, RecaptchaVerifier, linkWithPhoneNumber } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const PRESET_AVATARS = [
  { id: 'male', label: 'Male', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { id: 'female', label: 'Female', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia' },
  { id: 'neutral', label: 'Prefer not to say', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }
];

export function Profile() {
  const { currentUser, userProfile, isAdmin, logout, refreshProfile } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatar || PRESET_AVATARS[0].url);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<string | number | null>(null);

  const volunteerLevel = userProfile?.attendedCampaigns?.length || 0;
  
  const [editForm, setEditForm] = useState({
    name: userProfile?.name || '',
    email: userProfile?.email || '',
    gender: userProfile?.gender || '',
    age: userProfile?.age || '',
    mobileNumber: userProfile?.mobileNumber || ''
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync form when profile data or editing state changes
  useEffect(() => {
    if (userProfile && !isSaving) {
      setEditForm({
        name: userProfile.name || '',
        email: userProfile.email || '',
        gender: userProfile.gender || '',
        age: userProfile.age || '',
        mobileNumber: userProfile.mobileNumber || ''
      });
      setSelectedAvatar(userProfile.avatar || PRESET_AVATARS[0].url);
    }
  }, [userProfile, isSaving]);

  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  if (!currentUser) return null;

  if (!userProfile) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-20 pb-20 px-4 flex items-center justify-center pointer-events-auto"
      >
        <div className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl ${isDark ? 'bg-red-950/20 border-red-500/30' : 'bg-red-50 border-red-500/30'}`}>
          <h2 className="text-2xl font-serif font-bold text-red-500 mb-4">Profile Data Missing</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/80' : 'text-black/80'}`}>
            You are logged in, but your user profile could not be found in the database. This almost always happens if your <strong>Firestore Database Rules</strong> are set to "deny" writes, which prevents your account data from being saved when you sign up.
          </p>
          <div className={`p-4 rounded-xl text-xs font-mono mb-6 border ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/50 border-black/10'}`}>
            allow read, write: if true;
          </div>
          <button 
            onClick={() => logout()}
            className="w-full py-4 rounded-xl bg-red-500 text-white font-bold tracking-widest text-xs uppercase hover:bg-red-600 transition-colors"
          >
            Sign Out & Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  const handleUpdateAvatar = async () => {
    if (!userProfile) return;
    setIsSaving(true);
    try {
      const finalAvatar = customAvatarUrl || selectedAvatar;
      await updateDoc(doc(db, userProfile.docCollection, userProfile.docId), {
        avatar: finalAvatar
      });
      await refreshProfile();
      showNotification("Avatar Updated", "Your profile picture has been changed successfully.", "success");
      setIsEditingAvatar(false);
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      showNotification("Update Failed", error.message || "Failed to update avatar. Please check your permissions.", "info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, userProfile.docCollection, userProfile.docId), {
        name: editForm.name,
        email: editForm.email,
        gender: editForm.gender,
        age: editForm.age,
        mobileNumber: editForm.mobileNumber
      });
      await refreshProfile();
      showNotification("Profile Saved", "All changes have been successfully saved to your account.", "success");
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showNotification("Save Failed", error.message || "Could not save changes. Check your internet connection or permissions.", "info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendOtp = async () => {
    if (!editForm.mobileNumber) {
      setOtpError("Please enter a valid mobile number with country code.");
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await linkWithPhoneNumber(auth.currentUser!, editForm.mobileNumber, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
    } catch (error: any) {
      console.error(error);
      setOtpError(error.message || "Failed to send OTP.");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsVerifying(true);
    setOtpError('');
    try {
      await confirmationResult.confirm(otp);
      await updateDoc(doc(db, userProfile.docCollection, userProfile.docId), {
        phoneVerified: true,
        mobileNumber: editForm.mobileNumber
      });
      await refreshProfile();
      setOtpSent(false);
      setOtp('');
      alert("Phone number verified successfully!");
    } catch (error: any) {
      console.error(error);
      setOtpError("Invalid OTP code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentUser?.email) return;
    setResetError('');
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error: any) {
      setResetError('Failed to send reset email. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!passwordForDelete) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    
    setIsDeleting(true);
    setDeleteError('');
    try {
      if (auth.currentUser && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, passwordForDelete);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // Delete Firestore document
        await deleteDoc(doc(db, userProfile.docCollection, userProfile.docId));
        
        // Delete Auth user
        await deleteUser(auth.currentUser);
        
        navigate('/');
      }
    } catch (error: any) {
      let customError = 'Failed to delete account. Please try again later.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        customError = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        customError = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/requires-recent-login') {
        customError = 'This operation is sensitive and requires recent authentication. Please sign out and sign in again before retrying.';
      }
      setDeleteError(customError);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pt-20 pb-32 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* HEADER SECTION */}
        <div id="recaptcha-container"></div>
        <div className={`p-8 rounded-[32px] border flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl ${isDark ? 'bg-[#08080c]/80 border-white/10' : 'bg-white/80 border-black/10'} backdrop-blur-3xl`}>
          
          {/* Avatar Edit Mode */}
          <div className="relative group shrink-0">
            {isEditingAvatar ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-4 rounded-3xl border ${isDark ? 'bg-black/50 border-white/10' : 'bg-black/5 border-black/10'} flex flex-col items-center gap-4`}>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => { setSelectedAvatar(preset.url); setCustomAvatarUrl(''); }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${selectedAvatar === preset.url && !customAvatarUrl ? (isDark ? 'border-white bg-white/10' : 'border-black bg-black/5') : (isDark ? 'border-white/10 hover:border-white/30' : 'border-black/10 hover:border-black/30')}`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-10 h-10 rounded-full mb-1 bg-white" />
                      <span className={`text-[9px] font-bold text-center ${isDark ? 'text-white/70' : 'text-black/70'}`}>{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className="w-full relative">
                  <Upload className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                  <input 
                    type="url" 
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border outline-none transition-colors text-xs ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 placeholder:text-white/30' : 'bg-white border-black/10 focus:border-black/30 placeholder:text-black/30'}`}
                    placeholder="Custom image URL..."
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setIsEditingAvatar(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>CANCEL</button>
                  <button onClick={handleUpdateAvatar} disabled={isSaving} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex justify-center items-center ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="relative">
                <img src={userProfile.avatar} alt="Profile" className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/10 object-cover shadow-2xl border-4 border-transparent" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setIsEditingAvatar(true)}
                  className={`absolute bottom-2 right-2 p-3 rounded-full shadow-xl transition-transform hover:scale-110 ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}`}
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 w-full text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">{userProfile.name}</h1>
                {isAdmin && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/50 text-xs font-bold tracking-widest flex items-center gap-1 mt-2 md:mt-0">
                    <Shield className="w-3 h-3" />
                    ADMIN
                  </span>
                )}
              </div>
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isEditingProfile ? (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleUpdateProfile}
                  className="space-y-4 pt-4 border-t border-black/10 dark:border-white/10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className={`w-full p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Email Address</label>
                      <input 
                        type="email" 
                        value={editForm.email} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className={`w-full p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Gender</label>
                      <select 
                        value={editForm.gender} 
                        onChange={e => setEditForm({...editForm, gender: e.target.value})}
                        className={`w-full p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Age</label>
                      <input 
                        type="number" 
                        value={editForm.age} 
                        onChange={e => setEditForm({...editForm, age: e.target.value})}
                        className={`w-full p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Mobile Number</label>
                      <div className="flex gap-2">
                        <input 
                          type="tel" 
                          value={editForm.mobileNumber} 
                          onChange={e => setEditForm({...editForm, mobileNumber: e.target.value})}
                          placeholder="+1 234 567 8900"
                          className={`flex-1 p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                        />
                        <button 
                          type="button" 
                          onClick={handleSendOtp}
                          disabled={isVerifying || userProfile.phoneVerified}
                          className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${userProfile.phoneVerified ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'}`}
                        >
                          {isVerifying ? 'Sending...' : userProfile.phoneVerified ? 'Verified ✓' : 'Verify Phone'}
                        </button>
                      </div>
                      
                      {otpError && <p className="text-red-500 text-xs mt-1">{otpError}</p>}
                      
                      {otpSent && (
                        <div className="mt-2 flex gap-2">
                          <input 
                            type="text" 
                            value={otp} 
                            onChange={e => setOtp(e.target.value)}
                            placeholder="Enter 6-digit OTP"
                            className={`flex-1 p-3 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30' : 'bg-white border-black/10 focus:border-black/30'}`}
                          />
                          <button 
                            type="button" 
                            onClick={handleVerifyOtp}
                            disabled={isVerifying}
                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50`}
                          >
                            {isVerifying ? 'Verifying...' : 'Confirm OTP'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsEditingProfile(false)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>Cancel</button>
                    <button type="submit" disabled={isSaving} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 pt-2"
                >
                  <div className={`flex items-center justify-center md:justify-start gap-2 text-sm font-medium ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    <Mail className="w-4 h-4" />
                    {userProfile.email}
                  </div>
                  {(userProfile.gender || userProfile.age || userProfile.mobileNumber) && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                      {userProfile.gender && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>{userProfile.gender}</span>}
                      {userProfile.age && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>{userProfile.age} yrs</span>}
                      {userProfile.mobileNumber && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${userProfile.phoneVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                          {userProfile.mobileNumber}
                          {userProfile.phoneVerified && " ✓"}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`text-xs font-bold tracking-widest uppercase mt-4 opacity-50`}>
                    Joined {new Date(userProfile.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* STATS & BADGES (Hidden for Admins) */}
        {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[32px] border flex flex-col gap-6 shadow-lg ${isDark ? 'bg-[#08080c]/60 border-white/10' : 'bg-white/60 border-black/10'} backdrop-blur-3xl`}>
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-yellow-500" />
                <h3 className="font-serif text-xl font-bold">Earned Badges</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                {volunteerLevel > 0 && (
                  <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                    <span className="text-2xl">🎖️</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-center leading-tight">
                      Level {volunteerLevel}<br/>Volunteer
                    </span>
                  </div>
                )}
                {userProfile.badges.length > 0 ? (
                  userProfile.badges.map(badge => badge !== -1 ? (
                    <div key={badge} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                      <span className="text-2xl">🏆</span>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-center leading-tight">
                        {badge === 1 ? 'Newbie' : `${badge} Solved`}
                      </span>
                    </div>
                  ) : null)
                ) : volunteerLevel === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-black/40'}`}>No badges earned yet. Start reporting and resolving issues!</p>
                ) : null}
              </div>
            </div>

            <div className={`p-8 rounded-[32px] border flex flex-col gap-6 shadow-lg ${isDark ? 'bg-[#08080c]/60 border-white/10' : 'bg-white/60 border-black/10'} backdrop-blur-3xl`}>
              <div className="flex items-center gap-3">
                <FileBadge className="w-6 h-6 text-blue-500" />
                <h3 className="font-serif text-xl font-bold">My Certificates</h3>
              </div>
              <div className="flex flex-col gap-3">
                {userProfile.badges.length > 0 && (
                  <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <Award className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>Sabashi Certificate</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Unlocked</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedCertificate('sabashi')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${isDark ? 'bg-white text-black hover:scale-105' : 'bg-black text-white hover:scale-105'}`}
                    >
                      View
                    </button>
                  </div>
                )}
                
                {Array.from({ length: volunteerLevel }).map((_, i) => {
                  const level = i + 1;
                  return (
                    <div key={`vol-${level}`} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'} transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <FileBadge className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>Level {level} Volunteer</span>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Unlocked</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedCertificate(level)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${isDark ? 'bg-white text-black hover:scale-105' : 'bg-black text-white hover:scale-105'}`}
                      >
                        View
                      </button>
                    </div>
                  );
                })}

                {userProfile.badges.length === 0 && volunteerLevel === 0 && (
                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-black/40'}`}>No certificates unlocked. Report or verify issues to earn certificates!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT ACTIONS & DANGER ZONE */}
        <div className="space-y-6">
          <div className={`p-8 rounded-[32px] border shadow-lg ${isDark ? 'bg-[#08080c]/60 border-white/10' : 'bg-white/60 border-black/10'} backdrop-blur-3xl`}>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-2">
              <LogOut className="w-5 h-5" />
              Account Actions
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              Sign out of your account on this device.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => logout()}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10'}`}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button 
                onClick={handleResetPassword}
                disabled={resetSent}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${resetSent ? 'bg-green-500 text-white' : (isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10')}`}
              >
                {resetSent ? 'Link Sent!' : 'Reset Password'}
              </button>
            </div>
            {resetError && <p className="mt-2 text-xs text-red-500 font-bold">{resetError}</p>}
          </div>

        {/* DANGER ZONE */}
        <div className={`p-8 rounded-[32px] border shadow-lg ${isDark ? 'bg-red-950/10 border-red-500/20' : 'bg-red-50 border-red-500/20'} backdrop-blur-3xl`}>
          <h3 className="font-serif text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          <AnimatePresence>
            {showDeleteConfirm ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                {deleteError && <div className="p-3 bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl text-xs font-bold">{deleteError}</div>}
                <div>
                  <label className={`block text-xs font-bold tracking-widest uppercase mb-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Confirm Password</label>
                  <input 
                    type="password" 
                    autoComplete="current-password"
                    value={passwordForDelete}
                    onChange={(e) => setPasswordForDelete(e.target.value)}
                    className={`w-full max-w-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? 'bg-black/50 border-white/10 focus:border-white/30 text-white' : 'bg-white border-black/10 focus:border-black/30 text-black'}`}
                    placeholder="Enter password to confirm"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleDeleteAccount} disabled={isDeleting} className={`px-6 py-3 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                    {isDeleting ? 'DELETING...' : 'PERMANENTLY DELETE ACCOUNT'}
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} className={`px-6 py-3 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}>
                    CANCEL
                  </button>
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className={`px-6 py-3 rounded-xl text-xs font-bold transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
              >
                DELETE ACCOUNT
              </button>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCertificate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative w-[95%] md:w-full max-w-3xl p-6 md:p-12 rounded-[2rem] border-4 shadow-2xl overflow-y-auto max-h-[90vh] print:max-h-none print:w-full print:border-none print:shadow-none ${isDark ? 'bg-[#111] border-white/20' : 'bg-white border-black/20'}`}
            >
              {selectedCertificate === 'sabashi' ? (
                <>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200" />
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
                </>
              ) : (
                <>
                  <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${typeof selectedCertificate === 'number' && selectedCertificate >= 10 ? 'from-indigo-300 via-purple-500 to-indigo-300' : typeof selectedCertificate === 'number' && selectedCertificate >= 5 ? 'from-gray-300 via-slate-500 to-gray-300' : 'from-orange-300 via-amber-600 to-orange-300'}`} />
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />
                </>
              )}
              
              <div className="relative z-10 text-center space-y-8">
                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4 shadow-xl ${
                  selectedCertificate === 'sabashi' ? 'bg-yellow-100 border-yellow-400 text-yellow-600' :
                  (typeof selectedCertificate === 'number' && selectedCertificate >= 10) ? 'bg-indigo-100 border-indigo-400 text-indigo-600' :
                  (typeof selectedCertificate === 'number' && selectedCertificate >= 5) ? 'bg-slate-100 border-slate-400 text-slate-600' :
                  'bg-orange-100 border-orange-400 text-orange-600'
                }`}>
                  <Medal className="w-12 h-12" />
                </div>
                
                <div>
                  <h2 className={`text-[10px] md:text-xs uppercase tracking-[0.3em] font-black ${isDark ? 'text-white/50' : 'text-black/50'}`}>Certificate of Excellence</h2>
                  <h1 className={`text-4xl md:text-6xl font-serif italic font-medium mt-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedCertificate === 'sabashi' ? '"Sabashi!"' : `"Level ${selectedCertificate} Volunteer"`}
                  </h1>
                </div>

                <div className="space-y-4">
                  <p className={`text-sm tracking-widest uppercase font-bold ${isDark ? 'text-white/40' : 'text-black/40'}`}>This acknowledges that</p>
                  <p className={`text-3xl md:text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>{userProfile.name}</p>
                  <p className={`text-sm max-w-lg mx-auto leading-relaxed ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    {selectedCertificate === 'sabashi' ? (
                      <>Has demonstrated exceptional civic duty as a <strong>Civic Champion</strong>, accumulating a massive <strong>{userProfile.points || 0} Impact Points</strong> for the betterment of the community.</>
                    ) : (
                      <>Has proven their unwavering dedication to the community by actively attending and contributing to <strong>{selectedCertificate} Civic Campaign{typeof selectedCertificate === 'number' && selectedCertificate > 1 ? 's' : ''}</strong>.</>
                    )}
                  </p>
                </div>

                <div className="flex justify-between items-end pt-12 border-t border-black/10 dark:border-white/10 mt-12">
                  <div className="text-left">
                    <div className={`w-32 h-px mb-2 ${isDark ? 'bg-white/30' : 'bg-black/30'}`} />
                    <p className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>Civetra Platform Admin</p>
                  </div>
                  <div className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center opacity-50 border-blue-500/50">
                    <Star className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-right">
                    <div className={`w-32 h-px mb-2 ${isDark ? 'bg-white/30' : 'bg-black/30'}`} />
                    <p className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>Date of Issue</p>
                    <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-black'}`}>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 print:hidden z-20">
                <button 
                  onClick={() => window.print()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
                  title="Download / Print"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedCertificate(null)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
