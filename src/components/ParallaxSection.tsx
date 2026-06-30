import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface ParallaxSectionProps {
  children: React.ReactNode;
  imageUrl?: string;
  isDark: boolean;
  offset?: number;
  speed?: number;
}

export function ParallaxSection({ children, imageUrl, isDark, offset = 0, speed = 0.5 }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Create a spring physics wrapper around the scroll progress for smoother parallax
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Transform values for parallax effect
  const y = useTransform(smoothProgress, [0, 1], [-offset * speed, offset * speed]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], [1.1, 1, 1.1]);

  return (
    <div ref={ref} className="relative w-full min-h-[100vh] flex items-center justify-center overflow-hidden">
      {imageUrl && (
        <motion.div 
          className="absolute inset-0 z-[-1] w-full h-full"
          style={{ y, scale }}
        >
          <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/70' : 'bg-white/70'}`} />
          <img 
            src={imageUrl} 
            alt="Parallax Background" 
            className="w-full h-[120%] object-cover object-center absolute top-[-10%]"
          />
        </motion.div>
      )}
      
      <motion.div 
        style={{ opacity, y: useTransform(smoothProgress, [0, 1], [50, -50]) }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24"
      >
        {children}
      </motion.div>
    </div>
  );
}
