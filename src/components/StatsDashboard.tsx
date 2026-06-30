import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../ThemeContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import clsx from 'clsx';

// Mock Data for the Area Chart (Resolution Trajectory)
const trajectoryData = [
  { day: 'Mon', cases: 5 },
  { day: 'Tue', cases: 12 },
  { day: 'Wed', cases: 8 },
  { day: 'Thu', cases: 15 },
  { day: 'Fri', cases: 22 },
  { day: 'Sat', cases: 14 },
  { day: 'Sun', cases: 19 },
];

// Mock Data for the Bar Chart (Critical Regional Collapses)
const regionalData = [
  { region: 'Sector 12', collapses: 45 },
  { region: 'Sector 18', collapses: 32 },
  { region: 'Greater Noida', collapses: 68 },
  { region: 'Sector 62', collapses: 21 },
];

export function StatsDashboard() {
  const { isDark } = useTheme();

  return (
    <div className="w-full mb-16 space-y-8 md:space-y-12">
      {/* Dynamic Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {isDark ? (
          <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-white uppercase mb-2 pl-2">
            IMPACT & ANALYTICS HUB
          </h2>
        ) : (
          <div className="font-serif italic text-slate-800 pl-2">
            <h3 className="text-xs md:text-sm font-medium text-slate-400 mb-1 font-sans not-italic uppercase tracking-widest">Metrics & Impact</h3>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Transparency<br/>in numbers.
            </h2>
          </div>
        )}
      </motion.div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <MetricCard 
          title="Total Reported Cases" 
          value="1,248" 
          subtext="+12% THIS MONTH" 
          isDark={isDark} 
          delay={0.1}
        />
        <MetricCard 
          title="Resolved Milestones" 
          value="892" 
          subtext="+18% THIS MONTH" 
          isDark={isDark} 
          delay={0.2} 
        />
        <MetricCard 
          title="Community Validation Score" 
          value="94.2%" 
          subtext="+4.1% THIS MONTH" 
          isDark={isDark} 
          delay={0.3} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* Resolution Trajectory (Area Chart) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={clsx(
            "p-6 rounded-[2rem] border overflow-hidden h-[300px] md:h-[350px] flex flex-col",
            isDark ? "bg-[#0b0c10] border-white/10" : "bg-white border-black/5 shadow-xl"
          )}
        >
          <h4 className={clsx(
            "text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6",
            isDark ? "text-slate-400" : "text-slate-500 font-serif italic normal-case text-lg"
          )}>
            Resolution Trajectory
          </h4>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCasesDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCasesLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#333333" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#333333" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#111' : '#fff', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }} 
                  itemStyle={{ color: isDark ? '#10b981' : '#000', fontWeight: 'bold' }}
                />
                <Area 
                  isAnimationActive={true}
                  animationDuration={2000}
                  type="monotone" 
                  dataKey="cases" 
                  stroke={isDark ? "#10b981" : "#111111"} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill={isDark ? "url(#colorCasesDark)" : "url(#colorCasesLight)"} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Critical Regional Collapses (Bar Chart) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className={clsx(
            "p-6 rounded-[2rem] border h-[300px] md:h-[350px] flex flex-col",
            isDark ? "bg-[#0b0c10] border-white/10" : "bg-white border-black/5 shadow-xl"
          )}
        >
          <h4 className={clsx(
            "text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6",
            isDark ? "text-slate-400" : "text-slate-500 font-serif italic normal-case text-lg"
          )}>
            Critical {isDark ? 'Infrastructural Collapses By Region' : 'Regional Collapses'}
          </h4>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: isDark ? '#ffffff05' : '#00000005' }}
                  contentStyle={{ 
                    backgroundColor: isDark ? '#111' : '#fff', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: isDark ? '#d1d5db' : '#000', fontWeight: 'bold' }}
                />
                <Bar 
                  isAnimationActive={true}
                  animationDuration={2000}
                  dataKey="collapses" 
                  fill={isDark ? "#d1d5db" : "#0f172a"} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, subtext, isDark, delay }: { title: string, value: string, subtext: string, isDark: boolean, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={clsx(
        "p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border",
        isDark ? "bg-[#0b0c10] border-white/5" : "bg-transparent border-transparent"
      )}
    >
      <h5 className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 md:mb-4">{title}</h5>
      <div className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-slate-800 dark:text-white">
        {value}
      </div>
      <div className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest text-[#10b981]">
        {subtext}
      </div>
    </motion.div>
  );
}
