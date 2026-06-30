import React, { useEffect, useState } from "react";
import { Layers, MapPin, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Issue, ISSUE_CATEGORIES } from "../types";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useTheme } from "../ThemeContext";
import { StatsDashboard } from "../components/StatsDashboard";

import { useAuth } from "../contexts/AuthContext";

export function MyReports() {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [revokingIssueId, setRevokingIssueId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});

  const toggleTimeline = (id: string) => {
    setExpandedTimelines(prev => ({...prev, [id]: !prev[id]}));
  };

  useEffect(() => {
    if (!currentUser) return;
    
    // Fetch only the issues reported by the current user
    const q = query(collection(db, "issues"), where("reportedByUid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      // Sort in memory to avoid needing a composite index
      fetchedIssues.sort((a, b) => b.reportedAt - a.reportedAt);
      
      setIssues(fetchedIssues);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching my issues:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingIssueId || !revokeReason.trim()) return;
    setIsSubmittingRevoke(true);
    try {
      await updateDoc(doc(db, "issues", revokingIssueId), {
        status: 'revoked',
        revokeReason: revokeReason.trim(),
        revokedAt: Date.now()
      });
      setRevokingIssueId(null);
      setRevokeReason("");
    } catch (error) {
      console.error("Error revoking issue:", error);
    }
    setIsSubmittingRevoke(false);
  };

  const filteredIssues = issues.filter(issue => {
    if (activeTab === 'active') {
      return issue.status !== 'resolved';
    } else {
      return issue.status === 'resolved' || issue.status === 'revoked';
    }
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto w-full pt-16 px-4 md:px-0">
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-3.5 rounded-2xl border shadow-lg ${isDark ? 'bg-white/5 border-white/10 text-white shadow-white/5' : 'bg-black/5 border-black/10 text-black shadow-black/5'}`}>
          <Layers className="w-7 h-7" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Reports</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6 mt-12">
        <button 
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'active' 
              ? 'bg-blue-600 dark:bg-brand text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          Active Reports
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase transition-all ${
            activeTab === 'history' 
              ? 'bg-blue-600 dark:bg-brand text-white' 
              : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
          }`}
        >
          Resolved Reports History
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-brand animate-spin" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className={`backdrop-blur-3xl p-8 rounded-xl shadow-sm border text-center ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/5'}`}>
          <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium">No {activeTab === 'active' ? 'active' : 'resolved'} reports found.</p>
          <Link to="/report" className="inline-block px-6 py-3 bg-blue-600 dark:bg-brand text-white font-bold rounded-xl transition-colors hover:bg-blue-700 dark:hover:bg-brand/90">
            Submit a new report
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map(issue => (
            <div key={issue.id} className={`backdrop-blur-3xl p-6 md:p-8 rounded-[2rem] shadow-sm border flex flex-col gap-8 items-start ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/5'}`}>
               {/* Media & Details Side-by-Side */}
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  {(issue.mediaUrls && issue.mediaUrls.length > 0) || issue.mediaUrl || issue.imageUrl ? (
                    <div className="w-full sm:w-48 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner relative group">
                      {/* Show the first media file */}
                      {(() => {
                        const firstMedia = issue.mediaUrls?.[0] || issue.mediaUrl || issue.imageUrl || "";
                        if (firstMedia.startsWith("data:video")) {
                          return <video src={firstMedia} className="w-full h-full object-cover" />;
                        }
                        return <img src={firstMedia} alt={issue.title} className="w-full h-full object-cover" />;
                      })()}
                      {issue.mediaUrls && issue.mediaUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          +{issue.mediaUrls.length - 1} media
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full sm:w-48 h-32 rounded-2xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
                      <img src={ISSUE_CATEGORIES.find(c => c.id === issue.category)?.imageUrl || "/assets/categories/infrastructure.png"} alt={issue.category} className="w-full h-full object-cover" />
                    </div>
                  )}
                 <div className="flex-1 space-y-3">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className={clsx(
                       "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                       issue.severity === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                       issue.severity === "High" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                       issue.severity === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                     )}>
                       {issue.severity} Priority
                     </span>
                   </div>
                   <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{issue.title}</h3>
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-2">{issue.description}</p>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 pt-2 uppercase tracking-wider">
                     <MapPin className="w-4 h-4" />
                     <span className="truncate">{issue.location?.address || "Unknown Location"}</span>
                   </div>
                 </div>
               </div>

               {/* Amazon-Style Vertical Tracking Timeline */}
               <div className="w-full pt-6 border-t border-black/5 dark:border-white/10">
                 <div 
                   className="flex justify-between items-center cursor-pointer group mb-2"
                   onClick={() => toggleTimeline(issue.id)}
                 >
                   <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest group-hover:text-blue-500 transition-colors">Live Tracking Progress</h4>
                   <button className="text-slate-400 group-hover:text-blue-500 transition-colors">
                     {expandedTimelines[issue.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                   </button>
                 </div>
                 
                 <AnimatePresence>
                   {expandedTimelines[issue.id] && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden"
                     >
                       <div className="relative pl-4 mt-6">
                    {(() => {
                      const stepsData = [
                      { 
                        title: 'Issue Reported', 
                        desc: 'Your report was successfully submitted to the grid.', 
                        time: (() => {
                          const timeVal = issue.reportedAt;
                          let d = new Date();
                          if (timeVal) {
                            if (typeof timeVal === 'number') d = new Date(timeVal);
                            else if (typeof timeVal.toDate === 'function') d = timeVal.toDate();
                            else if (timeVal.seconds) d = new Date(timeVal.seconds * 1000);
                            else d = new Date(timeVal);
                          }
                          return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        })(), 
                        done: true 
                      },
                      { 
                        title: 'Community Verified', 
                        desc: 'Verified by local residents and AI analysis.', 
                        time: issue.status !== 'pending' ? (() => {
                          const timeVal = issue.reportedAt;
                          let d = new Date();
                          if (timeVal) {
                            if (typeof timeVal === 'number') d = new Date(timeVal + 86400000);
                            else if (typeof timeVal.toDate === 'function') d = new Date(timeVal.toDate().getTime() + 86400000);
                            else if (timeVal.seconds) d = new Date((timeVal.seconds * 1000) + 86400000);
                            else d = new Date(new Date(timeVal).getTime() + 86400000);
                          }
                          return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        })() : null, 
                        done: issue.status === 'verified' || issue.status === 'in_progress' || issue.status === 'resolved' 
                      },
                      { 
                        title: 'Action Initiated (In Progress)', 
                        desc: 'Assigned to the Municipal Infrastructure Department.', 
                        time: (issue.status === 'in_progress' || issue.status === 'resolved') ? (() => {
                          const timeVal = issue.reportedAt;
                          let d = new Date();
                          if (timeVal) {
                            if (typeof timeVal === 'number') d = new Date(timeVal + 172800000);
                            else if (typeof timeVal.toDate === 'function') d = new Date(timeVal.toDate().getTime() + 172800000);
                            else if (timeVal.seconds) d = new Date((timeVal.seconds * 1000) + 172800000);
                            else d = new Date(new Date(timeVal).getTime() + 172800000);
                          }
                          return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        })() : null, 
                        done: issue.status === 'in_progress' || issue.status === 'resolved' 
                      },
                      { 
                        title: 'Resolved & Closed', 
                        desc: 'The issue has been successfully fixed and verified.', 
                        time: issue.status === 'resolved' ? (() => {
                          const timeVal = issue.reportedAt;
                          let d = new Date();
                          if (timeVal) {
                            if (typeof timeVal === 'number') d = new Date(timeVal + 345600000);
                            else if (typeof timeVal.toDate === 'function') d = new Date(timeVal.toDate().getTime() + 345600000);
                            else if (timeVal.seconds) d = new Date((timeVal.seconds * 1000) + 345600000);
                            else d = new Date(new Date(timeVal).getTime() + 345600000);
                          }
                          return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        })() : null, 
                        done: issue.status === 'resolved' 
                      }
                    ];
                    
                    if (issue.status === 'revoked') {
                      stepsData.push({
                        title: 'Revoked (Re-opened)',
                        desc: `User revoked resolution. Reason: ${issue.revokeReason || 'Issue re-occurred'}`,
                        time: issue.revokedAt ? new Date(issue.revokedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently',
                        done: true
                      });
                    }

                    return stepsData.map((step, index) => {
                     let colorClass = "";
                     let lineGradient = "bg-black/10 dark:bg-white/10";
                     
                     if (step.done) {
                       if (index === 0) {
                         colorClass = "bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";
                         if (stepsData[1].done) lineGradient = "bg-gradient-to-b from-red-500 to-orange-500";
                         else lineGradient = "bg-gradient-to-b from-red-500 to-black/10 dark:to-white/10";
                       }
                       else if (index === 1) {
                         colorClass = "bg-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]";
                         if (stepsData[2].done) lineGradient = "bg-gradient-to-b from-orange-500 to-yellow-400";
                         else lineGradient = "bg-gradient-to-b from-orange-500 to-black/10 dark:to-white/10";
                       }
                       else if (index === 2) {
                         colorClass = "bg-yellow-400 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]";
                         if (stepsData[3].done) lineGradient = "bg-gradient-to-b from-yellow-400 to-green-500";
                         else lineGradient = "bg-gradient-to-b from-yellow-400 to-black/10 dark:to-white/10";
                       }
                       else if (index === 3) {
                         colorClass = "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]";
                       }
                     } else {
                       colorClass = "bg-white border-black/20 dark:bg-[#030308] dark:border-white/20";
                     }
                     
                     return (
                      <div key={index} className="relative flex items-stretch gap-6 mb-8 last:mb-0">
                        {/* Circle and Line Container */}
                        <div className="flex flex-col items-center w-4 flex-shrink-0">
                          <div className={clsx(
                            "w-4 h-4 rounded-full flex-shrink-0 z-10 border-4 transition-colors relative mt-1",
                            colorClass
                          )} />
                          {index < 3 && (
                            <div className={clsx(
                              "w-[3px] flex-1 mt-1 -mb-9 rounded-full",
                              lineGradient
                            )} />
                          )}
                        </div>
                       
                        {/* Step Content */}
                        <div className={clsx("flex-1 pb-1", step.done ? "opacity-100" : "opacity-40")}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <h5 className="font-bold text-slate-800 dark:text-white">{step.title}</h5>
                            {step.time && (
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{step.time}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{step.desc}</p>
                        </div>
                      </div>
                    );
                   });
                   })()}
                 </div>
                </motion.div>
              )}
            </AnimatePresence>
                 {issue.status === 'resolved' && (
                   <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 flex justify-end">
                     <button
                       onClick={() => setRevokingIssueId(issue.id)}
                       className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                     >
                       Re-open / Revoke
                     </button>
                   </div>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoke Modal */}
      {revokingIssueId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-6 rounded-3xl shadow-2xl border ${isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10'}`}
          >
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Revoke Issue Resolution</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
              Please provide a detailed reason for re-opening this issue. The administration and community will verify the claim.
            </p>
            <form onSubmit={handleRevokeSubmit}>
              <textarea
                required
                rows={4}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. The pothole has opened up again after the recent rain..."
                className={`w-full p-4 rounded-xl outline-none mb-6 resize-none transition-colors ${isDark ? 'bg-white/5 focus:bg-white/10 text-white' : 'bg-slate-50 focus:bg-slate-100 text-slate-900'}`}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRevokingIssueId(null);
                    setRevokeReason("");
                  }}
                  className={`px-6 py-2 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRevoke}
                  className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmittingRevoke ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke Issue'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
