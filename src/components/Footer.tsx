import React from 'react';
import { motion } from 'motion/react';
import { Github, DiscIcon as Discord, Linkedin, PhoneCall } from 'lucide-react';

interface FooterProps {
  isDark: boolean;
}

export default function Footer({ isDark }: FooterProps) {
  return (
    <footer className={`w-full py-12 px-12 border-t ${isDark ? 'border-white/10 text-gray-400 bg-[#030308]' : 'border-black/10 text-gray-500 bg-[#FAFAF8]'} font-sans relative z-10`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-4">
          <div className={`text-2xl font-bold tracking-tighter ${isDark ? 'text-[#F5F5F7] font-[\'Space+Grotesk\']' : 'text-[#0A0A0B] font-[\'Playfair+Display\'] italic'}`}>
            Civetra.
          </div>
          <p className="text-sm tracking-wide max-w-sm">
            Transforming distributed public failures into verified digital infrastructure realities.
          </p>
          <p className="text-xs tracking-widest uppercase opacity-60">
            © 2026 Civetra Platform
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-6">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-3 px-4 py-2 rounded-full  transition-colors ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            <PhoneCall size={16} />
            <span className="text-sm font-semibold tracking-wide">Emergency Community Helpline</span>
          </motion.div>

          <div className="flex items-center gap-6">
            <motion.a whileHover={{ y: -3, color: isDark ? '#fff' : '#000' }} href="#" className="transition-colors">
              <Github size={20} />
            </motion.a>
            <motion.a whileHover={{ y: -3, color: isDark ? '#fff' : '#000' }} href="#" className="transition-colors">
              <Discord size={20} />
            </motion.a>
            <motion.a whileHover={{ y: -3, color: isDark ? '#fff' : '#000' }} href="#" className="transition-colors">
              <Linkedin size={20} />
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  );
}
