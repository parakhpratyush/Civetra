import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const stableOnComplete = useCallback(onComplete, []);

  useEffect(() => {
    const duration = 2500; // Faster load, Twitch style
    const intervalTime = 40;
    const steps = duration / intervalTime;
    const increment = 100 / steps;
    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(timer);
        setTimeout(stableOnComplete, 500); // Hang on 100% for a split second before reveal
      }
      setProgress(Math.floor(currentProgress));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [stableOnComplete]);

  return (
    <motion.div
      key="loading-screen"
      initial={{ y: 0 }}
      exit={{ y: '-100vh' }}
      transition={{ 
        duration: 0.8, 
        ease: [0.76, 0, 0.24, 1] // Very snappy "pop" reveal easing, exactly like modern gaming sites
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0E0E10', // Twitch dark background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'all',
      }}
    >
      {/* Central Logo / Progress Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontSize: '4rem',
            fontWeight: 900,
            fontFamily: '"Space Grotesk", sans-serif',
            color: '#fff',
            letterSpacing: '-0.05em'
          }}
        >
          Civetra.
        </motion.div>

        {/* Progress bar container */}
        <div style={{
          width: '200px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: '#9146FF', // Twitch Rivals Purple
              borderRadius: '4px',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: 0.04 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
