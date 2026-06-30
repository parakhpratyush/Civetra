import React, { useState, useEffect } from "react";
import { HeartHandshake, MapPin, Users, ArrowLeft, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc, query, onSnapshot, doc, updateDoc, increment, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTheme } from "../ThemeContext";
import { useAuth } from "../contexts/AuthContext";

export function Volunteer() {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [campaignTab, setCampaignTab] = useState<'active' | 'history'>('active');
  const [viewingPastCampaign, setViewingPastCampaign] = useState<any>(null);
  const [pastCampaignVolunteers, setPastCampaignVolunteers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', details: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "campaigns"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    let unsubApps = () => {};
    if (currentUser) {
      const appsQuery = query(collection(db, "volunteers"), where("userId", "==", currentUser.uid));
      unsubApps = onSnapshot(appsQuery, (snap) => {
        setUserApplications(snap.docs.map(d => ({
          id: d.id,
          campaignId: d.data().campaignId,
          status: d.data().status
        })));
      });
    }

    return () => {
      unsubscribe();
      unsubApps();
    };
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must be securely logged in to apply for volunteer campaigns. Please log in first.");
      return;
    }
    if (!formData.name || !formData.phone || !formData.email || !selectedCampaign) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "volunteers"), {
        ...formData,
        campaignId: selectedCampaign.id,
        campaignTitle: selectedCampaign.title,
        status: 'pending',
        userId: currentUser?.uid || null,
        appliedAt: new Date().toISOString()
      });

      try {
        // Increment applicant count on the campaign so users can see how many people applied
        const { increment } = await import('firebase/firestore');
        await updateDoc(doc(db, "campaigns", selectedCampaign.id), {
          applicantsCount: increment(1)
        });
      } catch (countErr) {
        console.warn("Could not increment applicant count on campaign (permission denied), continuing anyway:", countErr);
      }
      
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit application: " + (err.message || "Permission Denied. Please check Firestore Rules."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPastCampaign = async (camp: any) => {
    setViewingPastCampaign(camp);
    const { getDocs, query: fsQuery, collection: fsCollection, where: fsWhere } = await import('firebase/firestore');
    const q = fsQuery(
      fsCollection(db, 'volunteers'), 
      fsWhere('campaignId', '==', camp.id), 
      fsWhere('status', 'in', ['approved', 'attended', 'absent'])
    );
    const snap = await getDocs(q);
    setPastCampaignVolunteers(snap.docs.map(d => d.data()));
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto w-full pt-32 text-center">
        <div className="w-24 h-24 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/40">
          <Clock className="w-12 h-12" />
        </div>
        <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Application Pending</h1>
        <p className={`text-lg max-w-sm mx-auto leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Thank you for applying to <strong>{selectedCampaign?.title}</strong>. Your request has been sent to the admin for review. You'll be notified once approved!
        </p>
        <button 
          onClick={() => { setSubmitted(false); setSelectedCampaign(null); setFormData({ name: '', phone: '', email: '', details: '' }); }}
          className={`mt-12 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
        >
          View More Campaigns
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full min-h-screen pt-24 pb-32 px-4 font-sans">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Volunteer Hub</h1>
                <p className={`text-sm mt-2 uppercase tracking-widest font-bold ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Make an Impact</p>
              </div>
            </div>
          
          <div className={`p-2 rounded-2xl border flex gap-2 w-max mb-8 ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
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
              onClick={() => setCampaignTab('history')}
              className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                campaignTab === 'history' 
                  ? 'bg-slate-600 text-white' 
                  : isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-black/5 text-slate-500'
              }`}
            >
              History
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedCampaign && !viewingPastCampaign ? (
            <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {campaigns.length === 0 ? (
                 <div className={`text-center p-12 rounded-3xl border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                   <p className={isDark ? 'text-white/40' : 'text-black/40'}>No active campaigns at the moment. Check back later!</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.filter(camp => {
                    const app = userApplications.find(a => a.campaignId === camp.id);
                    
                    if (campaignTab === 'history') {
                      return camp.active === false && app && ['approved', 'attended', 'absent'].includes(app.status);
                    }
                    
                    if (camp.active === false) return false;
                    
                    // Active logic:
                    // Show if rejected so they can acknowledge it
                    const isFull = (camp.filledSpots || 0) >= camp.spots;
                    if (isFull && app?.status !== 'approved' && app?.status !== 'rejected') return false; // Hide if full and not approved/rejected
                    
                    return true;
                  }).map(camp => {
                    const app = userApplications.find(a => a.campaignId === camp.id);
                    const hasApplied = !!app;
                    const status = app?.status;
                    
                    let btnText = 'Join Campaign';
                    let btnClasses = 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20';
                    let badgeText = 'OPEN';
                    let badgeClasses = 'bg-green-500/20 text-green-500';
                    
                    if (status === 'approved') {
                      btnText = "ACCEPTED - YOU'RE IN!";
                      btnClasses = 'bg-green-500/20 text-green-500 cursor-default';
                      badgeText = 'APPROVED';
                      badgeClasses = 'bg-green-500/20 text-green-500';
                    } else if (status === 'pending') {
                      btnText = 'APPLICATION PENDING';
                      btnClasses = isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-black/5 text-black/30 cursor-not-allowed';
                      badgeText = 'APPLIED';
                      badgeClasses = isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-500/10 text-amber-600';
                    } else if (status === 'rejected') {
                      btnText = 'OKAY';
                      btnClasses = 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20';
                      badgeText = 'SPOT FILLED / REJECTED';
                      badgeClasses = 'bg-red-500/20 text-red-500';
                    }
                    
                    return (
                      <div key={camp.id} className={`p-6 rounded-3xl border flex flex-col justify-between ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10 shadow-xl shadow-black/5'}`}>
                        <div>
                          <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest mb-4 ${badgeClasses}`}>
                            {badgeText}
                          </div>
                          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{camp.title}</h3>
                          {camp.description && (
                            <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{camp.description}</p>
                          )}
                          
                          <div className="space-y-2 mt-6">
                            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{camp.location}</span>
                            </div>
                            {(camp.date || camp.time) && (
                              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                <Clock className="w-4 h-4 shrink-0" />
                                <span className="truncate">
                                  {camp.date && new Date(camp.date).toLocaleDateString()} {camp.time && `at ${camp.time}`}
                                </span>
                              </div>
                            )}
                            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                              <Users className="w-4 h-4" />
                              <span>{camp.applicantsCount || 0} Applicants / {camp.spots} Spots</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={async () => {
                            if (campaignTab === 'history') {
                              handleViewPastCampaign(camp);
                            } else if (status === 'rejected' && app?.id) {
                              const { doc, deleteDoc } = await import('firebase/firestore');
                              await deleteDoc(doc(db, 'volunteers', app.id));
                            } else if (!hasApplied) {
                              setSelectedCampaign(camp);
                            }
                          }}
                          disabled={hasApplied && status !== 'rejected' && campaignTab !== 'history'}
                          className={`mt-8 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${campaignTab === 'history' ? 'bg-blue-600 text-white hover:bg-blue-700' : btnClasses}`}
                        >
                          {campaignTab === 'history' ? 'VIEW DETAILS' : btnText}
                        </button>
                      </div>
                    );
                  })}
                  {campaigns.filter(camp => {
                    const app = userApplications.find(a => a.campaignId === camp.id);
                    if (campaignTab === 'history') {
                      return camp.active === false && app && ['approved', 'attended', 'absent'].includes(app.status);
                    }
                    if (camp.active === false) return false;
                    const isFull = (camp.filledSpots || 0) >= camp.spots;
                    if (isFull && app?.status !== 'approved' && app?.status !== 'rejected') return false;
                    return true;
                  }).length === 0 && (
                    <div className="col-span-full text-center p-12 text-slate-500">
                      {campaignTab === 'history' ? 'No past campaigns yet.' : 'No active campaigns right now.'}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : viewingPastCampaign ? (
            <motion.div key="past-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button 
                onClick={() => setViewingPastCampaign(null)}
                className={`mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back to History
              </button>
              
              <div className={`p-8 rounded-[32px] border ${isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10 shadow-2xl shadow-black/5'}`}>
                <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 bg-slate-500/20 text-slate-500">
                  COMPLETED CAMPAIGN
                </div>
                <h2 className="text-4xl font-serif font-bold mb-4 tracking-tight">{viewingPastCampaign.title}</h2>
                {viewingPastCampaign.description && (
                  <p className={`text-base mb-6 ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                    {viewingPastCampaign.description}
                  </p>
                )}
                <div className={`flex flex-col md:flex-row md:items-center gap-4 text-sm font-bold uppercase tracking-widest mb-8 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{viewingPastCampaign.location}</span>
                  </div>
                  {(viewingPastCampaign.date || viewingPastCampaign.time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {viewingPastCampaign.date && new Date(viewingPastCampaign.date).toLocaleDateString()} {viewingPastCampaign.time && `at ${viewingPastCampaign.time}`}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={`p-6 rounded-2xl border mb-8 flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10'}`}>
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Campaign Lead</div>
                    <div className="text-lg font-bold">{viewingPastCampaign.lead || 'Not specified'}</div>
                  </div>
                </div>

                <h3 className={`text-lg font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Volunteer Roster</h3>
                <div className="space-y-4">
                  {pastCampaignVolunteers.map((vol, i) => (
                    <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/10'}`}>
                      <div>
                        <div className="font-bold">{vol.name}</div>
                        <div className={`text-xs font-mono mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{vol.email}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                        vol.status === 'attended' ? 'bg-green-500/20 text-green-500' :
                        vol.status === 'absent' ? 'bg-red-500/20 text-red-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {vol.status === 'attended' ? `ATTENDED ${vol.rating ? `(${vol.rating}⭐)` : ''}` : vol.status}
                      </div>
                    </div>
                  ))}
                  {pastCampaignVolunteers.length === 0 && (
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>No volunteers found for this campaign.</p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button 
                onClick={() => setSelectedCampaign(null)}
                className={`mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Back to Campaigns
              </button>
              
              <div className={`mb-8 p-6 rounded-3xl border border-blue-500/30 bg-blue-500/10`}>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">Applying for</p>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedCampaign.title}</h2>
                <div className={`flex items-center gap-2 mt-2 text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{selectedCampaign.location}</span>
                </div>
                {(selectedCampaign.date || selectedCampaign.time) && (
                  <div className={`flex items-center gap-2 mt-2 text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedCampaign.date && new Date(selectedCampaign.date).toLocaleDateString()} {selectedCampaign.time && `at ${selectedCampaign.time}`}
                    </span>
                  </div>
                )}
                {selectedCampaign.description && (
                  <div className="mt-4 pt-4 border-t border-blue-500/20">
                    <p className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{selectedCampaign.description}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className={`p-8 rounded-[2rem] shadow-xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/5'}`}>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full p-4 rounded-xl outline-none font-medium transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Phone Number</label>
                      <input 
                        required
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full p-4 rounded-xl outline-none font-medium transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Email Address</label>
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full p-4 rounded-xl outline-none font-medium transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Why do you want to volunteer? (Skills/Experience)</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.details}
                      onChange={e => setFormData({ ...formData, details: e.target.value })}
                      className={`w-full p-4 rounded-xl outline-none font-medium transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
                      placeholder="I have experience in..."
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? 'Submitting...' : 'Apply for Campaign'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
