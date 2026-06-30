import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './AdminDashboard';

export function AdminRoute() {
  const { isDark } = useTheme();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className={`text-xs font-bold tracking-widest ${isDark ? 'text-white/50' : 'text-black/50'}`}>VERIFYING CREDENTIALS...</div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative z-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full max-w-md p-8 rounded-[32px] text-center border shadow-2xl backdrop-blur-xl ${isDark ? 'bg-[#08080c] border-white/10' : 'bg-white border-black/10'}`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-2 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-50 text-red-600 border-red-200'}`}>
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-serif font-bold mb-4 tracking-tight">Access Denied</h1>
        <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
          This area is restricted to authorized administrative personnel only. Your access attempt has been logged.
        </p>
      </motion.div>
    </div>
  );
}
