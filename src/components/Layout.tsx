import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../ThemeContext';
import Chatbot from './Chatbot';
import { Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  isDark?: boolean;
  isFullScreen?: boolean;
}

export default function Layout({ children, header, isFullScreen }: LayoutProps) {
  const { isDark, toggleTheme, language, setLanguage, helpline, supportEmail } = useTheme();

  const languages = ["English", "Hindi", "Urdu", "Telugu", "Tamil", "Spanish", "French", "German", "Mandarin", "Arabic"];

  return (
    <div className={`min-h-screen grid grid-rows-[auto_1fr_auto] relative overflow-hidden select-none transition-colors duration-700 ${isDark ? 'dark bg-[#030308] text-[#e2e2e4] font-sans' : 'bg-[#FAFAF8] text-[#1a1a1a] font-serif'}`}>

      {/* BACKGROUND ELEMENTS (DARK ONLY) */}
      <AnimatePresence>
        {isDark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="grain-overlay" />
            <motion.div 
              className="blob bg-primary/20"
              animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              style={{ top: '10%', left: '-10%' }}
            />
            <motion.div 
              className="blob bg-secondary/15"
              animate={{ x: [0, -80, 0], y: [0, 120, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ bottom: '-10%', right: '-10%' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKGROUND ELEMENTS (LIGHT ONLY) */}
      <AnimatePresence>
        {!isDark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            <div className="grain-overlay opacity-30" />
            <motion.div 
              className="blob bg-blue-300/30 blur-[100px] rounded-full w-[600px] h-[600px] absolute"
              animate={{ x: [0, 150, 0], y: [0, -100, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              style={{ top: '-10%', left: '-10%' }}
            />
            <motion.div 
              className="blob bg-pink-300/30 blur-[100px] rounded-full w-[500px] h-[500px] absolute"
              animate={{ x: [0, -120, 0], y: [0, 150, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ bottom: '-10%', right: '-10%' }}
            />
            <motion.div 
              className="blob bg-teal-200/30 blur-[100px] rounded-full w-[400px] h-[400px] absolute"
              animate={{ x: [0, 100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              style={{ top: '40%', left: '40%' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header Container */}
      <div className="z-50 relative w-full sticky top-0">
        {header}
      </div>

      {/* Main Content */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`z-10 relative flex flex-col w-full ${isFullScreen ? 'p-0 max-w-none' : 'p-4 md:p-8 max-w-7xl mx-auto'}`}
      >
        {children}
      </motion.main>

      {/* THEME TOGGLE (Persistent) */}
      <div className="fixed bottom-24 right-6 z-[200]">
        <motion.button 
          onClick={toggleTheme}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors shadow-lg backdrop-blur-md outline-none focus:outline-none focus:ring-0 overflow-hidden ${isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white/80 border-black/10 text-black'}`}
          title="Toggle UI Architecture"
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </motion.button>
      </div>

      {/* CONDITIONAL FOOTER */}
      {isDark ? (
        <footer className="w-full bg-[#030308] border-t border-white/5 pt-8 pb-56 mt-auto z-40 relative">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-[#e2e2e4]">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg tracking-[0.2em] font-bold uppercase">Civetra</h2>
              <p className="opacity-60 max-w-sm leading-relaxed text-xs">
                Civetra establishes absolute transparency in citizen-driven infrastructure, bringing ground-level civic issues into clear, uncompromised visibility.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <p className="opacity-40 text-[10px]">© 2026 Civetra Platform. All Rights Reserved.</p>
                <select 
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    sessionStorage.setItem('civetra_session_lang', e.target.value);
                  }}
                  className="notranslate bg-white/5 border border-white/10 rounded-md text-xs px-2 py-1 outline-none focus:border-white/30 text-white/80 cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang} className="bg-[#111]">{lang}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Emergency & Support</h3>
              <p className="opacity-80 text-xs">Emergency Helpline: <a href={`tel:${helpline}`} className="opacity-100 font-bold hover:underline text-primary transition-colors ">{helpline}</a></p>
              <a href={`mailto:${supportEmail}`} className="opacity-80 hover:opacity-100 transition-opacity text-xs ">{supportEmail}</a>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-medium bg-white/5 w-max px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>System Status: Nominal</span>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-6">
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold tracking-[0.15em] opacity-60 uppercase">
                <a href="https://twitter.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-primary transition-all ">Twitter</a>
                <a href="https://github.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-primary transition-all ">Github</a>
                <a href="https://discord.gg/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-primary transition-all ">Discord</a>
                <a href="https://linkedin.com/company/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-primary transition-all ">Linkedin</a>
                <a href="https://instagram.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-primary transition-all ">Instagram</a>
                <a href="https://whatsapp.com/channel/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 hover:text-green-500 transition-all ">WhatsApp</a>
              </div>
            </div>
          </div>
        </footer>
      ) : (
        /* AIKA WAKENICHI LIGHT FOOTER */
        <footer className="w-full bg-[#FAFAF8] border-t border-black/5 pt-12 pb-56 mt-auto z-40 relative">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 text-[#1a1a1a]">
            <div>
              <h2 className="text-3xl font-serif italic mb-4">Civetra.</h2>
              <p className="max-w-md leading-relaxed text-sm opacity-80">
                An elegant journal of our shared infrastructure. We document the realities of our city with uncompromised clarity and absolute transparency.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <p className="opacity-40 text-xs font-sans">© 2026 Civetra Platform. All Rights Reserved.</p>
                <select 
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    sessionStorage.setItem('civetra_session_lang', e.target.value);
                  }}
                  className="notranslate bg-black/5 border border-black/10 rounded-md text-xs px-2 py-1 outline-none focus:border-black/30 text-black/80 cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col md:items-end justify-between font-sans">
              <div className="flex gap-6 text-sm font-medium tracking-wide">
                <a href={`tel:${helpline}`} className="hover:text-primary transition-colors  border-b border-black/10 hover:border-black/50 pb-1">Emergency {helpline}</a>
                <a href={`mailto:${supportEmail}`} className="hover:text-primary transition-colors  border-b border-black/10 hover:border-black/50 pb-1">Contact Us</a>
              </div>
              <div className="flex flex-wrap gap-4 mt-8 md:mt-0 opacity-60 text-xs font-bold tracking-wider uppercase">
                <a href="https://twitter.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">Twitter</a>
                <a href="https://github.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">Github</a>
                <a href="https://discord.gg/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">Discord</a>
                <a href="https://linkedin.com/company/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">Linkedin</a>
                <a href="https://instagram.com/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">Instagram</a>
                <a href="https://whatsapp.com/channel/civetra" target="_blank" rel="noreferrer" className="hover:opacity-100 transition-all ">WhatsApp</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Chatbot Component */}
      <Chatbot />
    </div>
  );
}
