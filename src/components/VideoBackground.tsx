import React, { useRef, useEffect, useState } from 'react';
import { useScroll, useTransform, motion, useMotionValueEvent, useSpring } from 'framer-motion';

interface VideoBackgroundProps {
  src: string;
  isDark: boolean;
  opacityRange?: [number, number];
  opacityValues?: [number, number];
}

export function VideoBackground({ 
  src, 
  isDark, 
  opacityRange = [0, 1], 
  opacityValues = [0.8, 0.2] 
}: VideoBackgroundProps) {
  const { scrollYProgress } = useScroll();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [duration, setDuration] = useState(0);

  // Smooth out the scroll progress so the video doesn't jitter when the user scrolls quickly
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  // Fade out the video as the user scrolls down
  const opacity = useTransform(smoothProgress, opacityRange, opacityValues);

  // Scrub the video based on scroll progress
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = latest * duration;
    }
  });

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 z-[-2] w-full h-full overflow-hidden"
      style={{ opacity }}
    >
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/60' : 'bg-white/40'}`} />
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: isDark ? 'brightness(0.7)' : 'brightness(1.1)' }}
      />
    </motion.div>
  );
}
