import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { Bell } from 'lucide-react';

import Navigation from './components/Navigation';
import Layout from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';

// Pages
import Home from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { Feed } from './pages/Feed';
import { Leaderboard } from './pages/Leaderboard';
import { Volunteer } from './pages/Volunteer';
import { ReportIssue } from './pages/ReportIssue';

function StitchesEnvironment({ children }: { children: React.ReactNode }) {
  // Stitches Cursor Physics
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 1500, mass: 0.05 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  
  const bg = useMotionTemplate`radial-gradient(600px circle at calc(${cursorX} * 1px) calc(${cursorY} * 1px), var(--c-mesh), transparent 40%)`;

  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Background Reactive Mesh (Google AI Stitches effect) */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-[-1]"
        style={{
          background: bg
        }}
      />
      <div className="grain-overlay" />

      {children}

      {/* Stitches Dot + Bubble Cursor (Rendered last for maximum z-index priority) */}
      <motion.div 
        className="stitches-dot hidden md:block"
        style={{ left: mouseX, top: mouseY }}
      />
      <motion.div 
        className="stitches-bubble hidden md:block"
        style={{ 
          left: cursorX, 
          top: cursorY 
        }}
      />
    </>
  );
}

import { MyReports } from './pages/MyReports';
import { AdminRoute } from './pages/AdminRoute';
import { Profile } from './pages/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Lock } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, setIsAuthModalOpen } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <span className={`text-xs font-bold tracking-widest ${isDark ? 'text-white/50' : 'text-black/50'}`}>AUTHENTICATING...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-md p-12 rounded-[32px] text-center border shadow-2xl backdrop-blur-xl ${isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10'}`}
        >
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}>
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 tracking-tight">Login Required</h2>
          <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
            Please sign in to your account to access this feature and start making a civic impact.
          </p>
          <motion.button 
            onClick={() => setIsAuthModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-lg ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            Sign In Now
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

function CivetraRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/volunteer" element={<Volunteer />} />
      <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/c-admin" element={<AdminRoute />} />
    </Routes>
  );
}


import { ThemeProvider, useTheme } from './ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { StatusListener } from './components/StatusListener';

function AppContent() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // The LoadingScreen component will now handle its own 4-second timeout and call onComplete
  }, []);

  return (
    <>
      {/* LOADING SCREEN - rendered OUTSIDE Layout so nothing leaks through, ONLY for Dark Mode */}
      <AnimatePresence>
        {isDark && loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <Layout isDark={isDark} header={<Navigation />} isFullScreen={false}>
      <CivetraRouter />
    </Layout>
    
    {/* Global Status & Gamification Listener (Outside Layout to avoid z-index traps) */}
    <StatusListener />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StitchesEnvironment>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </StitchesEnvironment>
    </BrowserRouter>
  );
}
