import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Plus, User, LogOut, Shield } from 'lucide-react';

export default function Navigation() {
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const { isDark } = useTheme();
  const { currentUser, userProfile, isAdmin, logout, isAuthModalOpen, setIsAuthModalOpen } = useAuth();
  const [insights, setInsights] = useState<{title: string, description: string}[]>([]);

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  useEffect(() => {
    fetch('/api/latest-insights')
      .then(res => res.json())
      .then(data => {
        if (data.insights) setInsights(data.insights);
      })
      .catch(err => console.error("Failed to fetch ticker insights:", err));
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Map', path: '/map' },
    { name: 'Updates', path: '/feed' },
    ...(userProfile?.role === 'admin' ? [] : [{ name: 'Volunteer', path: '/volunteer' }]),
    { name: 'Leaderboard', path: '/leaderboard' },
  ];

  return (
    <>
      {/* Top Header - Auto Hiding on Scroll */}
      <AnimatePresence>
        {showHeader && (
          <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 w-full z-40 flex flex-col font-serif text-on-background bg-transparent pointer-events-none"
          >
            {/* Global AI Ticker */}
            {location.pathname !== '/c-admin' && (
              <div 
                className={`pointer-events-auto relative w-full overflow-hidden py-2 px-4 text-[10px] font-bold uppercase tracking-widest border-b z-[60] flex items-center ${isDark ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-600 text-white border-blue-500'}`}
                style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
              >
                <div className="flex items-center whitespace-nowrap animate-marquee">
                  {insights.length > 0 ? insights.map((insight, idx) => (
                    <span key={idx} className="mx-8 text-blue-100 flex items-center gap-2">
                      <span className="text-blue-300">✦ AI INSIGHT:</span> {insight.title} — {insight.description}
                    </span>
                  )) : (
                    <>
                      <span className="mx-8 text-blue-100">✦ AI Insight: Monitoring civic infrastructure patterns in real-time...</span>
                      <span className="mx-8 text-blue-100">✦ AI Insight: Community engagement engine active and analyzing reports...</span>
                    </>
                  )}
                  {/* Duplicate for seamless loop if needed, but marquee usually handles it if content is long enough */}
                  {insights.map((insight, idx) => (
                    <span key={`dup-${idx}`} className="mx-8 text-blue-100 flex items-center gap-2">
                      <span className="text-blue-300">✦ AI INSIGHT:</span> {insight.title} — {insight.description}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="px-6 py-4 md:px-12 md:py-6 flex justify-between items-center w-full">
              <motion.div whileHover={{ scale: 1.05 }} className="pointer-events-auto">
                <Link to="/" className="flex items-center gap-3" aria-label="Go to homepage">
                  <img 
                    src="/pwa-192x192.png" 
                    alt="Civetra Logo" 
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-lg border border-white/10"
                  />
                  <span 
                    className={`transition-all duration-300 ${isDark ? 'text-white text-2xl tracking-widest' : 'text-slate-900 text-4xl tracking-wide'}`} 
                    style={{ fontFamily: isDark ? "'Knewave', display" : "'Great Vibes', cursive" }}
                  >
                    Civetra.
                  </span>
                </Link>
              </motion.div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* PERSISTENT ADD REPORT BUTTON (Top Right) */}
      {userProfile?.role !== 'admin' && (
        <div className="fixed top-14 right-4 md:top-16 md:right-8 z-[999] pointer-events-auto">
          <div className="flex gap-2">
            <Link to="/report" className="hidden md:block" aria-label="Add Report">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold tracking-widest text-sm shadow-lg ${isDark ? 'bg-white text-black shadow-white/10' : 'bg-[#111111] text-white shadow-black/10 backdrop-blur-md border border-black/20'}`}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                ADD REPORT
              </motion.div>
            </Link>
            <Link to="/report" className="md:hidden" aria-label="Add Report">
              <motion.div 
                whileHover={{ scale: 1.05, boxShadow: isDark ? "0 0 20px rgba(255,255,255,0.1)" : "0 8px 30px rgba(0,0,0,0.12)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full shadow-lg backdrop-blur-md border ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-[#111111] text-white border-black/20'}`}
              >
                <span>+ Report</span>
              </motion.div>
            </Link>
          </div>
        </div>
      )}



      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* APPLE VISION OS FLOATING GLASS PILL NAV */}
      {location.pathname !== '/c-admin' && (
      <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 font-sans pointer-events-auto w-[98%] sm:w-max max-w-full flex justify-center">
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className={`flex items-center gap-1 md:gap-2 px-2 py-2 md:px-3 md:py-3 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-3xl ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}
        >
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link key={link.name} to={link.path} className="shrink-0" aria-label={link.name} aria-current={isActive ? 'page' : undefined}>
                <motion.div 
                  whileHover={{ scale: 1.05, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }} 
                  whileTap={{ scale: 0.95 }} 
                  className={`relative px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm font-medium tracking-wider transition-colors duration-300 rounded-full ${isActive ? (isDark ? 'text-black' : 'text-white') : (isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}
                >
                  <span className="relative z-10">{link.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill"
                      className={`absolute inset-0 rounded-full z-0 ${isDark ? 'bg-white' : 'bg-black'}`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
          
          <div className={`h-4 w-[1px] shrink-0 mx-0.5 md:mx-2 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
          
          {currentUser && userProfile?.role !== 'admin' && (
            <Link to="/my-reports" className="shrink-0 mr-1">
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm font-medium tracking-wider rounded-full transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}
              >
                <span className="hidden md:inline">Track Report</span>
                <span className="md:hidden">Track</span>
              </motion.button>
            </Link>
          )}
          {isAdmin && (
            <Link to={location.pathname === '/c-admin' ? '/' : '/c-admin'} className="shrink-0 mr-1 md:mr-2" aria-label="Admin Dashboard">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border transition-colors ${location.pathname === '/c-admin' ? 'bg-amber-500 text-white border-amber-400' : (isDark ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-black/5 text-black border-black/10 hover:bg-black/10')}`}
              >
                <Shield className="w-4 h-4" />
              </motion.div>
            </Link>
          )}

          {currentUser ? (
            <Link to="/profile" className="shrink-0" aria-label="User Profile">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border transition-colors ${isDark ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
              >
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-white/10">
                      <User className={`w-3 h-3 ${isDark ? 'text-white' : 'text-black'}`} />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] md:text-sm font-bold tracking-wider ${isDark ? 'text-white' : 'text-black'}`}>Profile</span>
              </motion.div>
            </Link>
          ) : (
            <motion.button 
              onClick={() => setIsAuthModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Login"
              className={`flex items-center gap-2 px-4 py-1.5 md:px-5 md:py-2 rounded-full border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-white/90' : 'bg-black text-white border-black hover:bg-black/90'}`}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="text-[10px] md:text-sm font-bold tracking-wider">Login</span>
            </motion.button>
          )}
        </motion.div>
      </div>
      )}
    </>
  );
}
