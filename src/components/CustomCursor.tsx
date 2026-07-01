import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);

  const springConfig = { damping: 25, stiffness: 200 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);

  useEffect(() => {
    let lastTarget: EventTarget | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Center the 3px dot exactly on the mouse point
      cursorX.set(e.clientX - 1.5);
      cursorY.set(e.clientY - 1.5);

      const target = e.target as HTMLElement;
      if (!target || target === lastTarget) return;
      lastTarget = target;

      // Ensure target is still in DOM before checking styles
      if (document.body.contains(target)) {
        try {
          const styles = window.getComputedStyle(target);
          setIsPointer(
            styles.cursor === 'pointer' || 
            target.tagName === 'A' || 
            target.tagName === 'BUTTON' ||
            target.closest('button') !== null ||
            target.closest('a') !== null
          );
        } catch (err) {
          // If node is detached during check
          setIsPointer(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-3 h-3 rounded-full pointer-events-none z-[999999] mix-blend-difference hidden md:block"
      style={{
        translateX: cursorX,
        translateY: cursorY,
        backgroundColor: 'white',
      }}
      animate={{
        scale: isPointer ? 2.5 : 1,
        backgroundColor: isPointer ? 'transparent' : 'white',
        border: isPointer ? '1px solid white' : 'none',
      }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
    />
  );
};
