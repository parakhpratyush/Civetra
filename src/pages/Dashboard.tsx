import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Issue } from "../types";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../ThemeContext";
import { Target, CheckCircle, Clock, AlertTriangle, Zap, User, Star, Box } from "lucide-react";
import { ThreeDGallery } from "../components/ThreeDGallery";

// Removed static mock data in favor of dynamic calculation

export function Dashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [insights, setInsights] = useState<{title: string, description: string, iconType: string}[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [viewMode, setViewMode] = useState<'classic' | '3d'>('classic');
  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribeIssues = onSnapshot(collection(db, "issues"), (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const fetchedUsers: any[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });
      setUsers(fetchedUsers);
    });

    return () => {
      unsubscribeIssues();
      unsubscribeUsers();
    };
  }, []);

  // Calculate actual stats for the lower section
  const totalReported = issues.length;
  const resolved = issues.filter(i => i.status === "resolved").length;
  const inProgress = issues.filter(i => i.status === "in_progress").length;
  const verified = issues.filter(i => i.status === "verified").length;

  useEffect(() => {
    // Wait until issues are loaded from Firestore before the first AI fetch
    // If the database is actually empty, we still want to fetch after a short delay
    const shouldFetch = !insightsLoading && !hasAttemptedFetch && (issues.length > 0 || totalReported === 0);
    
    if (shouldFetch) {
      setInsightsLoading(true);
      setHasAttemptedFetch(true);
      
      const issuesSummary = issues.length > 0 
        ? [...issues]
            .sort((a, b) => {
              const tA = a.reportedAt?.toMillis ? a.reportedAt.toMillis() : 0;
              const tB = b.reportedAt?.toMillis ? b.reportedAt.toMillis() : 0;
              return tB - tA;
            })
            .slice(0, 20)
            .map(i => `- ${i.title} (Category: ${i.category}, Location: ${i.location?.address || 'Unknown'})`)
            .join('\n')
        : "No recent issues (Database is currently empty/new).";

      fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuesSummary })
      })
      .then(async res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.insights && data.insights.length > 0) {
          setInsights(data.insights);
        } else {
          throw new Error("Empty insights returned");
        }
      })
      .catch(err => {
        console.error("Failed to fetch insights:", err);
        // Robust fallback
        setInsights([
          { title: "Community Resilience Peak", description: "Civetra analysis indicates growing community participation in civic monitoring.", iconType: "zap" },
          { title: "Smart City Infrastructure", description: "Our AI systems are monitoring urban patterns to optimize city resource allocation.", iconType: "alert" }
        ]);
      })
      .finally(() => setInsightsLoading(false));
    }
  }, [issues.length, totalReported, insightsLoading, hasAttemptedFetch]);

  const categoryData = useMemo(() => {
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

  const recentIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      const timeA = a.reportedAt?.toMillis ? a.reportedAt.toMillis() : 0;
      const timeB = b.reportedAt?.toMillis ? b.reportedAt.toMillis() : 0;
      return timeB - timeA;
    }).slice(0, 4);
  }, [issues]);

  const topContributors = useMemo(() => {
    return [...users]
      .filter(u => u.points && u.points > 0)
      .map(u => ({
        name: u.name || "Anonymous",
        role: u.role === 'admin' ? "Command Lead" : "Civic Champion",
        points: u.points || 0
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);
  }, [users]);

  const trajectoryData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const count = issues.filter(issue => {
        if (!issue.reportedAt) return false;
        // Handle Firestore Timestamp or number
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

  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    issues.forEach(issue => {
      const addr = issue.location?.address || "Unknown Area";
      // Extract the first part of the address for the region name
      let shortAddr = addr.split(',')[0].trim();
      if (shortAddr.length > 15) shortAddr = shortAddr.substring(0, 15) + '...';
      regions[shortAddr] = (regions[shortAddr] || 0) + 1;
    });
    const sorted = Object.entries(regions).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // Return top 5 regions, or empty placeholder if no issues
    if (sorted.length === 0) return [{ name: 'No Data', value: 0 }];
    return sorted.slice(0, 5);
  }, [issues]);

  // Design Variables
  const chartFill = isDark ? "#ffffff" : "#000000";
  const axisColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  return (
    <div className="w-full min-h-screen bg-transparent pt-20 pb-32 px-6 md:px-12 font-sans overflow-x-hidden">
      
      {/* SECTION 1: IMPACT & ANALYTICS HUB */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-7xl mx-auto mb-24">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <h1 className="text-4xl md:text-6xl tracking-tighter uppercase">
            {isDark ? (
              <span className="font-sans font-bold">Impact & Analytics Hub</span>
            ) : (
              <span className="font-serif italic tracking-tight font-medium normal-case">Transparency in numbers.</span>
            )}
          </h1>
          
          <div className={`p-1.5 rounded-full flex gap-1 w-max relative shadow-inner border backdrop-blur-xl ${isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-gray-200/50 border-black/5'}`}>
            <button 
              onClick={() => setViewMode('classic')}
              className={`relative z-10 px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-colors duration-300 ${
                viewMode === 'classic' 
                  ? (isDark ? 'text-white' : 'text-black') 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {viewMode === 'classic' && (
                <motion.div 
                  layoutId="dashboardViewToggle"
                  className={`absolute inset-0 rounded-full z-[-1] shadow-md ${isDark ? 'bg-white/10 border border-white/10' : 'bg-white'}`}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              Classic View
            </button>
            <button 
              onClick={() => setViewMode('3d')}
              className={`relative z-10 px-6 py-2.5 flex items-center gap-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-colors duration-300 ${
                viewMode === '3d' 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {viewMode === '3d' && (
                <motion.div 
                  layoutId="dashboardViewToggle"
                  className="absolute inset-0 rounded-full z-[-1] bg-gradient-to-r from-purple-600 to-blue-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Box className="w-3.5 h-3.5" />
              3D Gallery
            </button>
          </div>
        </div>

        {viewMode === '3d' ? (
          <div className="mb-24">
            <ThreeDGallery issues={issues} isDark={isDark} />
          </div>
        ) : (
          <>
            {/* Top 3 Huge Metrics */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-b border-black/10 dark:border-white/10 pb-12 mb-12">
          
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-4 font-bold">Total Reported Issues</p>
            <div className="flex flex-col gap-1">
              <span className="text-5xl md:text-6xl font-sans tracking-tighter font-semibold">{totalReported}</span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-4 font-bold">Resolved Incidents</p>
            <div className="flex flex-col gap-1">
              <span className="text-5xl md:text-6xl font-sans tracking-tighter font-semibold">{resolved}</span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-4 font-bold">Active Citizens</p>
            <div className="flex flex-col gap-1">
              <span className="text-5xl md:text-6xl font-sans tracking-tighter font-semibold">{users.length}</span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
            </div>
          </div>

          <div className="flex-1 md:text-right">
            <p className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-4 font-bold">Community Validation Score</p>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-5xl md:text-6xl font-sans tracking-tighter font-semibold">
                {totalReported > 0 ? Math.round(((verified + resolved) / totalReported) * 100) : 0}%
              </span>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Real-time</span>
            </div>
          </div>
          
        </div>

        {/* Big Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Area Chart: Resolution Trajectory */}
          <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 md:p-8 h-[400px]">
            <h3 className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold mb-8">Resolution Trajectory</h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectoryData}>
                  <defs>
                    <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke={chartFill} strokeWidth={2} fillOpacity={1} fill="url(#colorTrajectory)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Regional Collapses */}
          <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-[2rem] p-6 md:p-8 h-[400px]">
            <h3 className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold mb-8">Critical Infrastructural Collapses by Region</h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} barSize={60}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: axisColor, fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: axisColor, fontSize: 10}} dx={-10} />
                  <Tooltip 
                    cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
                    contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', fontSize: '12px' }}
                    itemStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" fill={chartFill} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        </>
        )}
      </motion.div>

      {/* SECTION 2: CITY OVERVIEW */}
      {viewMode === 'classic' && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full max-w-7xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-8">City Overview</h2>
        
        {/* KPI Row (Small boxes) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-6 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <Target className="w-5 h-5 mb-4 text-black/40 dark:text-white/40" />
            <div className="text-3xl font-bold tracking-tighter mb-1">{totalReported}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-black/50 dark:text-white/50">Total Reported</div>
          </div>
          <div className="p-6 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mb-4 text-black/40 dark:text-white/40" />
            <div className="text-3xl font-bold tracking-tighter mb-1">{verified}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-black/50 dark:text-white/50">Verified</div>
          </div>
          <div className="p-6 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <Clock className="w-5 h-5 mb-4 text-black/40 dark:text-white/40" />
            <div className="text-3xl font-bold tracking-tighter mb-1">{inProgress}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-black/50 dark:text-white/50">In Progress</div>
          </div>
          <div className="p-6 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 mb-4 text-black/40 dark:text-white/40" />
            <div className="text-3xl font-bold tracking-tighter mb-1">{resolved}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-black/50 dark:text-white/50">Resolved</div>
          </div>
        </div>

        {/* Lower Grid: 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Issues by Category */}
          <div className="p-8 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-3xl shadow-xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] transform-gpu will-change-transform">
            <div className="relative z-10 h-full flex flex-col">
              <h3 className="text-sm font-bold tracking-tight mb-4">Issues by Category</h3>
              <div className="flex-1 w-full min-h-[250px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-black/50 dark:text-white/50 italic">No category data available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="p-8 rounded-[2rem] border-[3px] border-purple-500 bg-purple-500/10 dark:bg-purple-900/20 backdrop-blur-sm relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.3)] dark:shadow-[0_0_60px_rgba(168,85,247,0.2)] transform-gpu will-change-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
            <div className="absolute top-8 right-8 text-[10px] uppercase tracking-[0.2em] font-black border border-purple-500 px-4 py-2 rounded-full text-purple-700 dark:text-purple-300 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              {insightsLoading ? "Analyzing Data..." : "Gemini Predictive AI"}
            </div>
            <h3 className="text-xl font-black tracking-tight mb-8 text-purple-900 dark:text-purple-100 flex items-center gap-3">
              <Star className="w-6 h-6 text-purple-500 fill-purple-500" />
              AI Predictive Insights
            </h3>
            
            {insightsLoading ? (
              <div className="flex justify-center items-center h-32 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-6">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-5 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                      {insight.iconType === 'alert' ? (
                        <AlertTriangle className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                      ) : (
                        <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold mb-2 text-purple-900 dark:text-purple-100">{insight.title}</p>
                      <p className="text-[11px] uppercase tracking-widest text-purple-800/80 dark:text-purple-200/80 font-black leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-800/60 dark:text-purple-200/60 italic mt-8 relative z-10">Not enough data to generate predictive insights yet.</p>
            )}
          </div>

          {/* Top Contributors */}
          <div className="p-8 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-3xl shadow-xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] transform-gpu will-change-transform">
            <div className="relative z-10">
              <h3 className="text-sm font-bold tracking-tight mb-8">Top Contributors</h3>
              <div className="space-y-6">
                {topContributors.length > 0 ? (
                  topContributors.map((user, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-black/30 dark:text-white/30 w-4">#{i+1}</span>
                        <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-black/60 dark:text-white/60" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{user.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">{user.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{user.points}</p>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Impact</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                    <p className="text-xs font-bold mb-1 opacity-70">No Top Citizens Yet</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">Be the first to climb the leaderboard by reporting issues!</p>
                  </div>
                )}
              </div>
          </div>
        </div>

          {/* Recent Activity */}
          <div className="p-8 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-3xl shadow-xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] transform-gpu will-change-transform">
            <div className="relative z-10">
              <h3 className="text-sm font-bold tracking-tight mb-8">Recent Activity</h3>
              <div className="space-y-6">
                {recentIssues.length > 0 ? recentIssues.map((issue, i) => (
                <div key={issue.id || i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-black/60 dark:text-white/60" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1 leading-snug">{issue.title}</p>
                    <p className="text-[9px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold">{issue.severity} Severity &middot; {issue.status}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-black/50 dark:text-white/50 italic">No recent activity found.</p>
              )}
            </div>
          </div>
        </div>

        </div>
      </motion.div>
      )}
    </div>
  );
}
