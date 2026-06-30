import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Issue } from '../types';
import { useTheme } from '../ThemeContext';
import { Shield, Trash2, CheckCircle, Clock, AlertTriangle, Users, Twitter, Facebook, Linkedin, MessageCircle, Instagram, Share2, X, Copy, Loader2, Mail, BarChart2, Star, Box } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ThreeDGallery } from '../components/ThreeDGallery';

export function AdminDashboard() {
  const { isDark, language, setLanguage, helpline, setHelpline, supportEmail, setSupportEmail } = useTheme();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'issues' | 'volunteers' | 'campaigns' | 'settings' | 'users' | 'analytics'>('analytics');
  const [viewMode, setViewMode] = useState<'classic' | '3d'>('classic');
  const [volunteerTab, setVolunteerTab] = useState<'applications' | 'database'>('applications');
  const [campaignTab, setCampaignTab] = useState<'active' | 'past'>('active');
  
  const [localLang, setLocalLang] = useState(language);
  const [localHelp, setLocalHelp] = useState(helpline);
  const [localEmail, setLocalEmail] = useState(supportEmail);
  
  const [newCampaign, setNewCampaign] = useState({ title: '', location: '', spots: 5, lead: '', date: '', time: '', description: '' });
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  // Assign Volunteer Modal State
  const [assignModalUser, setAssignModalUser] = useState<any | null>(null);
  const [assignCampaignId, setAssignCampaignId] = useState<string>('');

  // Share Impact Modal State
  const [shareIssue, setShareIssue] = useState<Issue | null>(null);
  const [shareText, setShareText] = useState("");
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  const openShareModal = async (issue: Issue) => {
    setShareIssue(issue);
    
    const fullDetails = `🚨 Civetra Issue Report 🚨
Title: ${issue.title}
Status: ${issue.status.toUpperCase()}
Severity: ${issue.severity}
Category: ${issue.category}
Location: ${issue.location.address || 'Unknown'}
Reporter: ${issue.reportedBy}
Date: ${issue.reportedAt ? new Date(issue.reportedAt.seconds * 1000).toLocaleString() : new Date().toLocaleString()}

Description: 
${issue.description}

#Civetra #CommunityImpact`;

    setShareText(fullDetails);
    setIsGeneratingShare(false);
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    alert("Copied to clipboard!");
  };

  useEffect(() => {
    const qIssues = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'));
    const unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
    });

    const qVols = query(collection(db, 'volunteers'), orderBy('appliedAt', 'desc'));
    const unsubscribeVols = onSnapshot(qVols, (snapshot) => {
      const fetchedVols: any[] = [];
      snapshot.forEach((doc) => {
        fetchedVols.push({ id: doc.id, ...doc.data() });
      });
      setVolunteers(fetchedVols);
    });

    const qCamps = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribeCamps = onSnapshot(qCamps, (snapshot) => {
      const fetchedCamps: any[] = [];
      snapshot.forEach((doc) => {
        fetchedCamps.push({ id: doc.id, ...doc.data() });
      });
      setCampaigns(fetchedCamps);
    });

    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const fetchedUsers: any[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });
      // Sort users by points
      fetchedUsers.sort((a, b) => (b.points || 0) - (a.points || 0));
      setAllUsers(fetchedUsers);
    });

    return () => {
      unsubscribeIssues();
      unsubscribeVols();
      unsubscribeCamps();
      unsubscribeUsers();
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (confirm(`Change status to ${newStatus}?`)) {
      const issue = issues.find(i => i.id === id);
      const oldStatus = issue?.status;
      
      await updateDoc(doc(db, 'issues', id), { status: newStatus });
      
      const targetUserId = issue?.authorId || issue?.reportedByUid || issue?.userId;
      
      if (targetUserId && targetUserId !== 'anonymous') {
        const { increment } = await import('firebase/firestore');
        try {
          if (oldStatus !== 'resolved' && newStatus === 'resolved') {
            await updateDoc(doc(db, 'users', targetUserId), { points: increment(100) });
          } else if (oldStatus === 'resolved' && newStatus !== 'resolved') {
            await updateDoc(doc(db, 'users', targetUserId), { points: increment(-100) });
          }
        } catch (err: any) {
          console.error('Failed to update issue points:', err);
        }
      }
    }
  };

  const handleVolunteerStatus = async (vol: any, newStatus: string) => {
    try {
      const { doc, updateDoc, collection, getDocs, query, where, writeBatch, increment, arrayUnion, arrayRemove } = await import('firebase/firestore');
      
      const oldStatus = vol.status;
      await updateDoc(doc(db, 'volunteers', vol.id), { status: newStatus });

      const wasApproved = ['approved', 'attended', 'absent'].includes(oldStatus);
      const isApproved = ['approved', 'attended', 'absent'].includes(newStatus);

      if (!wasApproved && isApproved) {
        await updateDoc(doc(db, 'campaigns', vol.campaignId), { filledSpots: increment(1) });
        
        // Check if campaign is now full
        const campaign = campaigns.find(c => c.id === vol.campaignId);
        const currentFilled = (campaign?.filledSpots || 0) + 1;
        
        if (campaign && currentFilled >= campaign.spots) {
          const fsCollection = collection;
          const pendingQuery = query(
            fsCollection(db, 'volunteers'), 
            where('campaignId', '==', vol.campaignId), 
            where('status', '==', 'pending')
          );
          const snapshot = await getDocs(pendingQuery);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
              batch.update(docSnap.ref, { status: 'rejected' });
            });
            await batch.commit();
          }
        }
      } else if (wasApproved && !isApproved) {
        await updateDoc(doc(db, 'campaigns', vol.campaignId), { filledSpots: increment(-1) });
      }

      if (vol.userId) {
        if (oldStatus !== 'attended' && newStatus === 'attended') {
          await updateDoc(doc(db, 'users', vol.userId), { 
            attendedCampaigns: arrayUnion(vol.campaignId),
            points: increment(200)
          });
        } else if (oldStatus === 'attended' && newStatus !== 'attended') {
          await updateDoc(doc(db, 'users', vol.userId), { 
            attendedCampaigns: arrayRemove(vol.campaignId),
            points: increment(-200)
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Error updating status: " + (err.message || "Permission Denied"));
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title || !newCampaign.location || !newCampaign.lead || !newCampaign.date || !newCampaign.time || !newCampaign.description) return;
    if (Number(newCampaign.spots) < 1) {
      alert("Spots must be at least 1.");
      return;
    }
    const { addDoc, serverTimestamp, collection } = await import('firebase/firestore');
    await addDoc(collection(db, 'campaigns'), {
      title: newCampaign.title,
      location: newCampaign.location,
      spots: Number(newCampaign.spots),
      lead: newCampaign.lead,
      date: newCampaign.date,
      time: newCampaign.time,
      description: newCampaign.description,
      filledSpots: 0,
      applicantsCount: 0,
      createdAt: serverTimestamp(),
      active: true
    });
    setNewCampaign({ title: '', location: '', spots: 5, lead: '', date: '', time: '', description: '' });
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalUser || !assignCampaignId) return;

    const { addDoc, collection, doc, updateDoc, increment, serverTimestamp, getDocs, query, where, writeBatch } = await import('firebase/firestore');

    const campaign = campaigns.find(c => c.id === assignCampaignId);
    if (!campaign) return;

    // Check if they already applied
    const existingQ = query(
      collection(db, 'volunteers'),
      where('campaignId', '==', assignCampaignId),
      where('email', '==', assignModalUser.email)
    );
    const existingSnap = await getDocs(existingQ);
    
    if (!existingSnap.empty) {
      alert("This volunteer is already associated with this campaign.");
      return;
    }

    // Create the volunteer application as approved
    await addDoc(collection(db, 'volunteers'), {
      campaignId: assignCampaignId,
      name: assignModalUser.name,
      email: assignModalUser.email,
      phone: assignModalUser.phone,
      details: 'Directly assigned by Admin',
      status: 'approved',
      assignedByAdmin: true,
      userId: assignModalUser.id || null,
      appliedAt: new Date().toISOString()
    });

    const currentFilled = (campaign.filledSpots || 0) + 1;
    await updateDoc(doc(db, 'campaigns', assignCampaignId), { filledSpots: increment(1) });

    // Auto-reject if full
    if (currentFilled >= campaign.spots) {
      const pendingQuery = query(
        collection(db, 'volunteers'), 
        where('campaignId', '==', assignCampaignId), 
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(pendingQuery);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { status: 'rejected' });
        });
        await batch.commit();
      }
    }

    setAssignModalUser(null);
    setAssignCampaignId('');
    alert("Volunteer assigned successfully!");
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Delete this campaign?')) {
      await deleteDoc(doc(db, 'campaigns', id));
    }
  };

  const handleRating = async (volId: string, rating: number) => {
    await updateDoc(doc(db, 'volunteers', volId), { rating });
  };

  const handleCompleteCampaign = async (id: string) => {
    if (confirm('Mark this campaign as completed? It will be removed from active lists.')) {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'campaigns', id), { active: false });
    }
  };

  const handleRevokeCampaign = async (id: string) => {
    if (confirm('Reactivate this campaign? It will be moved back to the active list.')) {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'campaigns', id), { active: true });
    }
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'campaigns', editingCampaign.id), {
      title: editingCampaign.title,
      location: editingCampaign.location,
      spots: Number(editingCampaign.spots),
      lead: editingCampaign.lead,
      date: editingCampaign.date,
      time: editingCampaign.time,
      description: editingCampaign.description,
    });
    setEditingCampaign(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this issue?')) {
      await deleteDoc(doc(db, 'issues', id));
    }
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'instagram' | 'email', issue: Issue) => {
    const text = shareText;
    const encodedText = encodeURIComponent(text);
    const url = encodeURIComponent('https://civetra.com');
    
    let shareUrl = '';
    if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodedText}`;
    if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    if (platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    if (platform === 'email') shareUrl = `mailto:?subject=Impact%20Report&body=${encodedText}`;
    if (platform === 'instagram') {
      navigator.clipboard.writeText(text + " " + decodeURIComponent(url));
      alert("Text copied to clipboard! Paste it in your Instagram story or post.");
      shareUrl = `https://instagram.com`;
    }
    
    if (platform !== 'instagram') window.open(shareUrl, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Command Center</h1>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Manage platform content and volunteers</p>
          </div>
        </div>
        <Link 
          to="/" 
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border transition-all ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-black/20 text-black hover:bg-black/10'}`}
        >
          Switch to User Mode
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('issues')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'issues' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline-block mr-2" />
          Issues
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'users' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Leaderboard
        </button>
        <button 
          onClick={() => setActiveTab('volunteers')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'volunteers' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Volunteers
        </button>
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'campaigns' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline-block mr-2" />
          Campaigns
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'analytics' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <BarChart2 className="w-4 h-4 inline-block mr-2" />
          Analytics
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'settings' 
              ? 'bg-red-500 text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          <Shield className="w-4 h-4 inline-block mr-2" />
          Settings
        </button>
      </div>

      {activeTab === 'analytics' && (
        <AdminAnalytics issues={issues} isDark={isDark} />
      )}

      {activeTab === 'settings' && (
        <div className={`rounded-3xl border p-8 max-w-2xl ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
          <h2 className={`text-xl font-bold tracking-tight mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Global Platform Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-black/60'}`}>System Language</label>
              <select 
                value={localLang}
                onChange={(e) => setLocalLang(e.target.value)}
                className={`notranslate w-full p-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}
              >
                {["English", "Hindi", "Urdu", "Telugu", "Tamil", "Spanish", "French", "German", "Mandarin", "Arabic"].map(lang => (
                  <option key={lang} value={lang} className={isDark ? 'bg-[#111]' : ''}>{lang}</option>
                ))}
              </select>
              <p className={`text-[10px] mt-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>This will change the default language interface for all incoming users.</p>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-black/60'}`}>Emergency Helpline Number</label>
              <input 
                type="text"
                value={localHelp}
                onChange={(e) => setLocalHelp(e.target.value)}
                placeholder="e.g. 112 or 911"
                className={`w-full p-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-black/5 border-black/10 text-black placeholder-black/30'}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-black/60'}`}>Support Email</label>
              <input 
                type="email"
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                placeholder="support@civetra.org"
                className={`w-full p-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-black/5 border-black/10 text-black placeholder-black/30'}`}
              />
            </div>
            
            <button 
              onClick={() => {
                sessionStorage.removeItem('civetra_session_lang');
                localStorage.setItem('civetra_admin_lang', localLang);
                setLanguage(localLang);
                setHelpline(localHelp);
                setSupportEmail(localEmail);
                alert('Settings saved globally!');
              }}
              className="mt-4 px-6 py-3 bg-red-500 text-white font-bold text-sm tracking-widest uppercase rounded-xl hover:bg-red-600 transition-colors w-full md:w-auto"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <>
          <div className="flex justify-end mb-6">
            <div className={`p-1.5 rounded-xl border flex gap-1 ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
              <button 
                onClick={() => setViewMode('classic')}
                className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                  viewMode === 'classic' 
                    ? 'bg-blue-600 text-white' 
                    : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
                }`}
              >
                Classic List
              </button>
              <button 
                onClick={() => setViewMode('3d')}
                className={`px-4 py-1.5 flex items-center gap-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                  viewMode === '3d' 
                    ? 'bg-purple-600 text-white' 
                    : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
                }`}
              >
                <Box className="w-3 h-3" />
                3D Gallery
              </button>
            </div>
          </div>
          {viewMode === '3d' ? (
            <div className="mb-12">
              <ThreeDGallery issues={issues} isDark={isDark} />
            </div>
          ) : (
            <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
              <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>
                <tr>
                  <th className="p-4">Report</th>
                  <th className="p-4">Reporter (Masked)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {issues.map(issue => (
                  <tr key={issue.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className="p-4">
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{issue.title}</p>
                      <p className={`text-xs mt-1 max-w-xs truncate ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{issue.description}</p>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/10 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                        {issue.reportedBy ? issue.reportedBy.slice(0, 3) : 'Anon'}***
                      </span>
                    </td>
                    <td className="p-4">
                      <select 
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        className={`text-xs font-bold uppercase tracking-wider p-2 rounded-lg outline-none ${
                          issue.status === 'resolved' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                          issue.status === 'in_progress' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                          issue.status === 'verified' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                          'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        {issue.status === 'revoked' && <option value="revoked">Revoked</option>}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {issue.status === 'resolved' && (
                          <button 
                            onClick={() => openShareModal(issue)} 
                            className={`flex items-center gap-2 px-3 py-1.5 mr-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md border ${isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-black/5 border-black/10 text-black hover:bg-black/10 shadow-[0_0_15px_rgba(0,0,0,0.05)]'}`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                          </button>
                        )}
                        <button onClick={() => handleDelete(issue.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Delete Report">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
        </>
      )}

      {activeTab === 'volunteers' && (
        <div className="space-y-6">
          <div className={`p-2 rounded-2xl border flex gap-2 w-max ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <button 
              onClick={() => setVolunteerTab('applications')}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                volunteerTab === 'applications' 
                  ? 'bg-blue-600 text-white' 
                  : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
              }`}
            >
              Active Applications
            </button>
            <button 
              onClick={() => setVolunteerTab('database')}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                volunteerTab === 'database' 
                  ? 'bg-green-600 text-white' 
                  : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
              }`}
            >
              Volunteer Database
            </button>
          </div>

          <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            {volunteerTab === 'applications' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>
                    <tr>
                      <th className="p-4">Applicant</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">App. Status</th>
                      <th className="p-4 text-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-white/10">
                    {volunteers.filter(vol => {
                      const camp = campaigns.find(c => c.id === vol.campaignId);
                      return camp?.active !== false;
                    }).map(vol => (
                  <tr key={vol.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className="p-4">
                      <div className="font-bold">{vol.name}</div>
                      <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                        {campaigns.find(c => c.id === vol.campaignId)?.title || 'Unknown Campaign'}
                      </div>
                      {vol.assignedByAdmin && (
                        <div className="mt-1 inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-500">
                          Assigned by Admin
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-xs space-y-1">
                      <p>{vol.email}</p>
                      <p className="font-mono opacity-60">{vol.phone}</p>
                    </td>
                    <td className="p-4 text-xs max-w-xs">{vol.details}</td>
                    <td className="p-4">
                      <select 
                        value={['attended', 'absent'].includes(vol.status) ? 'approved' : vol.status}
                        onChange={(e) => handleVolunteerStatus(vol, e.target.value)}
                        className={`text-xs font-bold uppercase tracking-wider p-2 rounded-lg outline-none ${
                          ['approved', 'attended', 'absent'].includes(vol.status) ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                          vol.status === 'rejected' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                          'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {['approved', 'attended', 'absent'].includes(vol.status) ? (
                         <div className="flex flex-col items-center gap-2">
                           <div className="flex justify-center gap-2">
                             <button 
                               onClick={() => handleVolunteerStatus(vol, 'attended')} 
                               disabled={vol.status === 'absent'}
                               className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors ${vol.status === 'attended' ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'} ${vol.status === 'absent' ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                               Present
                             </button>
                             <button 
                               onClick={() => handleVolunteerStatus(vol, 'absent')} 
                               disabled={vol.status === 'attended'}
                               className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors ${vol.status === 'absent' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'} ${vol.status === 'attended' ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                               Absent
                             </button>
                           </div>
                           {vol.status === 'attended' && (
                             <div className="flex items-center gap-1 mt-1 group/stars">
                               {[1, 2, 3, 4, 5].map(star => (
                                 <button 
                                   key={star} 
                                   onClick={() => !vol.rating && handleRating(vol.id, star)} 
                                   disabled={!!vol.rating}
                                   title={`Rate ${star} stars`} 
                                   className={`focus:outline-none group ${!vol.rating ? 'transition-transform hover:scale-125' : 'cursor-default'}`}
                                 >
                                   <Star className={`w-4 h-4 transition-colors ${vol.rating >= star ? 'text-yellow-400 fill-yellow-400' : isDark ? 'text-white/20 group-hover:text-yellow-400 group-hover:fill-yellow-400' : 'text-black/10 group-hover:text-yellow-400 group-hover:fill-yellow-400'}`} />
                                 </button>
                               ))}
                             </div>
                           )}
                         </div>
                      ) : (
                         <div className="text-center">
                           <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Requires Approval</span>
                         </div>
                      )}
                    </td>
                  </tr>
                ))}
                {volunteers.filter(vol => {
                  const camp = campaigns.find(c => c.id === vol.campaignId);
                  return camp?.active !== false;
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No active applications found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>
                <tr>
                  <th className="p-4">Volunteer Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Completed Campaigns</th>
                  <th className="p-4">Avg Rating</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {(() => {
                  const dbMap = new Map();
                  volunteers.forEach(vol => {
                    const camp = campaigns.find(c => c.id === vol.campaignId);
                    if (camp?.active === false && vol.status === 'attended') {
                      if (!dbMap.has(vol.email)) {
                        dbMap.set(vol.email, {
                          name: vol.name,
                          email: vol.email,
                          phone: vol.phone,
                          userId: vol.userId,
                          campaigns: [camp.title],
                          totalStars: vol.rating || 0,
                          instances: 1
                        });
                      } else {
                        const existing = dbMap.get(vol.email);
                        if (!existing.campaigns.includes(camp.title)) {
                          existing.campaigns.push(camp.title);
                        }
                        existing.totalStars += (vol.rating || 0);
                        existing.instances += 1;
                      }
                    }
                  });
                  
                  const dbVols = Array.from(dbMap.values());
                  
                  if (dbVols.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">No verified past volunteers yet.</td>
                      </tr>
                    );
                  }
                  
                  return dbVols.map((vol, i) => (
                    <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                      <td className="p-4 font-bold">{vol.name}</td>
                      <td className="p-4 text-xs space-y-1">
                        <p>{vol.email}</p>
                        <p className="font-mono opacity-60">{vol.phone}</p>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {vol.campaigns.map((c: string, idx: number) => (
                            <span key={idx} className={`px-2 py-1 rounded-md ${isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70'}`}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-bold text-yellow-500">
                          {vol.instances > 0 && vol.totalStars > 0 ? (vol.totalStars / vol.instances).toFixed(1) : '-'} <Star className="w-4 h-4 fill-yellow-500" />
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                          Across {vol.instances} attendance(s)
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => { setAssignModalUser(vol); setAssignCampaignId(''); }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateCampaign} className={`p-6 rounded-3xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create New Campaign</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <input type="text" placeholder="Campaign Title (e.g. Pothole Filling)" className={`lg:col-span-2 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} required />
              <input type="text" placeholder="Location" className={`lg:col-span-2 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.location} onChange={e => setNewCampaign({...newCampaign, location: e.target.value})} required />
              <input type="text" placeholder="Lead Volunteer Name" className={`lg:col-span-2 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.lead} onChange={e => setNewCampaign({...newCampaign, lead: e.target.value})} required />
              <input type="date" className={`lg:col-span-2 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.date} onChange={e => setNewCampaign({...newCampaign, date: e.target.value})} required />
              <input type="time" className={`lg:col-span-2 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.time} onChange={e => setNewCampaign({...newCampaign, time: e.target.value})} required />
              <div className="flex gap-4 lg:col-span-2">
                <input type="number" placeholder="Spots" className={`w-24 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.spots} onChange={e => setNewCampaign({...newCampaign, spots: Number(e.target.value)})} required />
                <button type="submit" className="flex-1 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">Create</button>
              </div>
              <textarea placeholder="Campaign Description (What will happen, who will be there, where to go, etc.)" className={`lg:col-span-6 p-3 rounded-xl border min-h-[100px] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} required />
            </div>
          </form>

          <div className={`p-2 rounded-2xl border flex gap-2 w-max ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <button 
              onClick={() => setCampaignTab('active')}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                campaignTab === 'active' 
                  ? 'bg-blue-600 text-white' 
                  : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
              }`}
            >
              Active Campaigns
            </button>
            <button 
              onClick={() => setCampaignTab('past')}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                campaignTab === 'past' 
                  ? 'bg-slate-600 text-white' 
                  : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
              }`}
            >
              Past Campaigns
            </button>
          </div>

          <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Engagement</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {campaigns.filter(c => campaignTab === 'active' ? c.active !== false : c.active === false).map(camp => (
                  <tr key={camp.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <td className="p-4 font-bold">{camp.title}</td>
                    <td className="p-4">{camp.location}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{camp.applicantsCount || 0}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Applied</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>{camp.filledSpots || 0}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Approved</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{camp.spots}</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {camp.active !== false ? (
                          <button onClick={() => handleCompleteCampaign(camp.id)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors" title="Mark Completed">
                            Complete
                          </button>
                        ) : (
                          <button onClick={() => handleRevokeCampaign(camp.id)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors" title="Reactivate Campaign">
                            Revoke
                          </button>
                        )}
                        <button onClick={() => setEditingCampaign(camp)} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors" title="Edit Campaign">
                          <span className="text-[10px] font-bold uppercase">Edit</span>
                        </button>
                        <button onClick={() => handleDeleteCampaign(camp.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Delete Campaign">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.filter(c => campaignTab === 'active' ? c.active !== false : c.active === false).length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      {campaignTab === 'active' ? 'No active campaigns.' : 'No past campaigns yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Users className="w-5 h-5 text-red-500" />
              Global Leaderboard & User Activity
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Monitor all registered citizens, their Impact Points, and contact information. As an admin, you have full visibility into the community.
            </p>
          </div>

          <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase font-bold tracking-widest ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Citizen</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Impact Points</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {allUsers.map((u, index) => (
                  <tr key={u.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${u.role === 'admin' ? (isDark ? 'bg-red-500/5' : 'bg-red-50') : ''}`}>
                    <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="avatar" className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10" referrerPolicy="no-referrer" />
                        <span className="font-bold">{u.name || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td className="p-4 opacity-80">{u.email}</td>
                    <td className="p-4">
                      {u.role === 'admin' ? (
                        <span className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider">Admin</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-wider">User</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold">
                        {u.points || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <button onClick={async () => {
                        if (confirm(`Are you sure you want to delete user ${u.name}? This will remove their profile from the database.`)) {
                          await deleteDoc(doc(db, 'users', u.id));
                        }
                      }} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No users found in the database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shareIssue && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl relative scrollbar-hide ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}
          >
            <div className="p-6">
              <button onClick={() => setShareIssue(null)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" />
                Share Resolution Impact
              </h3>
              
              <div className={`p-4 rounded-2xl mb-6 relative ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`}>
                {isGeneratingShare ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    <button onClick={handleCopyShare} className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded-xl transition-colors z-10" title="Copy Text">
                      <Copy className="w-4 h-4" />
                    </button>
                    <div className="max-h-[30vh] overflow-y-auto pr-8 scrollbar-hide">
                      <p className="text-xs italic opacity-90 whitespace-pre-wrap">{shareText}</p>
                    </div>
                    
                    {/* MEDIA PREVIEW */}
                    {(shareIssue?.imageUrl || (shareIssue?.mediaUrls && shareIssue.mediaUrls.length > 0)) && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs font-bold uppercase mb-2 opacity-50">Attached Media (Right-click to Copy/Save)</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {shareIssue.imageUrl && (
                            <img src={shareIssue.imageUrl} alt="Issue Media" className="h-24 w-auto rounded-lg border border-white/20 object-cover" />
                          )}
                          {shareIssue.mediaUrls?.map((url, i) => (
                            url.includes('image/') || url.startsWith('data:image') ? (
                              <img key={i} src={url} alt={`Media ${i}`} className="h-24 w-auto rounded-lg border border-white/20 object-cover" />
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4 text-center">Share directly to</p>
              
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => handleShare('twitter', shareIssue)} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-colors disabled:opacity-50">
                  <Twitter className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Twitter</span>
                </button>
                <button onClick={() => handleShare('facebook', shareIssue)} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-[#4267B2]/10 text-[#4267B2] hover:bg-[#4267B2] hover:text-white transition-colors disabled:opacity-50">
                  <Facebook className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Facebook</span>
                </button>
                <button onClick={() => handleShare('linkedin', shareIssue)} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5] hover:text-white transition-colors disabled:opacity-50">
                  <Linkedin className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">LinkedIn</span>
                </button>
                <button onClick={async () => {
                  try {
                    const shareData: any = {
                      title: 'Civetra Issue Report',
                      text: shareText
                    };
                    
                    const allMedia = [];
                    if (shareIssue?.imageUrl) allMedia.push(shareIssue.imageUrl);
                    if (shareIssue?.mediaUrls) allMedia.push(...shareIssue.mediaUrls);
                    
                    if (allMedia.length > 0) {
                      const files = await Promise.all(allMedia.map(async (b64, idx) => {
                        const res = await fetch(b64);
                        const blob = await res.blob();
                        let ext = 'bin';
                        if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = 'jpg';
                        else if (blob.type.includes('png')) ext = 'png';
                        else if (blob.type.includes('pdf')) ext = 'pdf';
                        return new File([blob], `media_${idx}.${ext}`, { type: blob.type });
                      }));
                      
                      if (navigator.canShare && navigator.canShare({ files })) {
                        shareData.files = files;
                      }
                    }
                    
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      alert("Native sharing is not supported on this device/browser.");
                    }
                  } catch (err) {
                    console.error("Share failed", err);
                  }
                }} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors disabled:opacity-50">
                  <Share2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Native<br/>Share</span>
                </button>
                <button onClick={() => handleShare('whatsapp', shareIssue)} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors disabled:opacity-50">
                  <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  <span className="text-[10px] font-bold">WhatsApp</span>
                </button>
                <button onClick={() => handleShare('email', shareIssue)} disabled={isGeneratingShare} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-50">
                  <Mail className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Email</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Assign Volunteer Modal */}
      {assignModalUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-black/5'}`}>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Assign Volunteer</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Assign <strong>{assignModalUser.name}</strong> to an active campaign.</p>
            
            <form onSubmit={handleAssignSubmit}>
              <div className="mb-6">
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Select Campaign</label>
                <select
                  required
                  value={assignCampaignId}
                  onChange={e => setAssignCampaignId(e.target.value)}
                  className={`w-full p-4 rounded-xl outline-none font-medium transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
                >
                  <option value="">-- Choose Campaign --</option>
                  {campaigns.filter(c => c.active && (c.filledSpots || 0) < c.spots).map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.spots - (c.filledSpots || 0)} spots left)</option>
                  ))}
                </select>
                {campaigns.filter(c => c.active && (c.filledSpots || 0) < c.spots).length === 0 && (
                  <p className="text-xs text-red-500 mt-2">There are no active campaigns with available spots.</p>
                )}
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setAssignModalUser(null)} className={`flex-1 p-4 rounded-xl font-bold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>Cancel</button>
                <button type="submit" disabled={!assignCampaignId} className="flex-1 p-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

    {/* Edit Campaign Modal */}
    {editingCampaign && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-3xl p-6 rounded-3xl border shadow-2xl relative ${
            isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10'
          }`}
        >
          <button
            onClick={() => setEditingCampaign(null)}
            className={`absolute top-4 right-4 p-2 rounded-full ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-white/50' : 'bg-black/5 hover:bg-black/10 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Campaign</h3>
          <form onSubmit={handleUpdateCampaign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Title" className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.title} onChange={e => setEditingCampaign({...editingCampaign, title: e.target.value})} required />
              <input type="text" placeholder="Location" className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.location} onChange={e => setEditingCampaign({...editingCampaign, location: e.target.value})} required />
              <input type="text" placeholder="Lead Name" className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.lead} onChange={e => setEditingCampaign({...editingCampaign, lead: e.target.value})} required />
              <div className="flex gap-4">
                <input type="number" placeholder="Spots" className={`w-full p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.spots} onChange={e => setEditingCampaign({...editingCampaign, spots: Number(e.target.value)})} required />
              </div>
              <input type="date" className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.date} onChange={e => setEditingCampaign({...editingCampaign, date: e.target.value})} required />
              <input type="time" className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.time} onChange={e => setEditingCampaign({...editingCampaign, time: e.target.value})} required />
            </div>
            <textarea placeholder="Description" className={`w-full p-3 rounded-xl border min-h-[120px] ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`} value={editingCampaign.description} onChange={e => setEditingCampaign({...editingCampaign, description: e.target.value})} required />
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditingCampaign(null)} className={`px-6 py-3 rounded-xl font-bold ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}>Cancel</button>
              <button type="submit" className="px-6 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg">Save Changes</button>
            </div>
          </form>
        </motion.div>
      </div>,
      document.body
    )}

    </motion.div>
  );
}

function AdminAnalytics({ issues, isDark }: { issues: Issue[], isDark: boolean }) {
  const trajectoryData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const count = issues.filter(issue => {
        if (!issue.reportedAt) return false;
        const ts = typeof issue.reportedAt === 'object' && 'toMillis' in issue.reportedAt 
          ? issue.reportedAt.toMillis() 
          : issue.reportedAt;
        const issueDate = new Date(ts as any);
        return issueDate.getDate() === d.getDate() && issueDate.getMonth() === d.getMonth() && issueDate.getFullYear() === d.getFullYear();
      }).length;
      
      data.push({ name: dayName, value: count });
    }
    return data;
  }, [issues]);

  const categoryData = React.useMemo(() => {
    const categories = issues.reduce((acc, issue) => {
      const cat = issue.category || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const total = Math.max(1, issues.length);
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [issues]);

  const chartFill = isDark ? "#ef4444" : "#dc2626";
  const axisColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Area Chart: Resolution Trajectory */}
      <div className={`border rounded-[2rem] p-6 md:p-8 h-[400px] ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
        <h3 className="text-[10px] uppercase tracking-widest font-bold mb-8 opacity-50">Reports Over Time (Last 7 Days)</h3>
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData}>
              <defs>
                <linearGradient id="colorTrajectoryAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartFill} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={chartFill} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: axisColor, fontSize: 10}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: axisColor, fontSize: 10}} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', fontSize: '12px' }}
                itemStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke={chartFill} strokeWidth={2} fillOpacity={1} fill="url(#colorTrajectoryAdmin)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Issues by Category */}
      <div className={`border rounded-[2rem] p-6 md:p-8 h-[400px] ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
        <h3 className="text-[10px] uppercase tracking-widest font-bold mb-4 opacity-50">Category Breakdown</h3>
        <div className="w-full h-[280px]">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={isDark ? `hsl(${index * 45}, 70%, 60%)` : `hsl(${index * 45}, 70%, 40%)`} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', fontSize: '12px' }}
                  itemStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
                  formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percent}%)`, name]}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ fontSize: '12px', opacity: 0.8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs opacity-50 italic">No category data available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
