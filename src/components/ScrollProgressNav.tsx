import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Building2, Wrench } from 'lucide-react';

interface ScrollProgressNavProps {
  isDark: boolean;
}

export function ScrollProgressNav({ isDark }: ScrollProgressNavProps) {
  const { scrollYProgress } = useScroll();

  // The knob travels down the 200px line
  const knobY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div className="fixed left-4 md:left-12 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4">
      {/* Top Icon: The City */}
      <Building2 
        className={`w-5 h-5 transition-colors ${isDark ? 'text-white/40' : 'text-black/40'}`} 
      />

      {/* The Line and Knob */}
      <div className="relative w-px h-[200px]">
        {/* Background Track */}
        <div className={`absolute inset-0 w-full h-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        
        {/* Active Knob */}
        <motion.div 
          className={`absolute left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
          style={{ top: knobY }}
        />
      </div>

      {/* Bottom Icon: Fixing / Community */}
      <Wrench 
        className={`w-5 h-5 transition-colors ${isDark ? 'text-white/40' : 'text-black/40'}`} 
      />
    </div>
  );
}
