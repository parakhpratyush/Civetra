import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#0028FF]/20 dark:hover:text-[#0028FF] transition-colors relative focus:outline-none"
      aria-label="Toggle dark mode"
      style={{ width: '40px', height: '40px' }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Sun className="w-5 h-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : -180, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon className="w-5 h-5" />
      </motion.div>
    </button>
  );
}
