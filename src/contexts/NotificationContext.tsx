import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info, Bell, Award, X } from 'lucide-react';

type NotificationType = 'success' | 'info' | 'ai' | 'milestone';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const playTruongSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      // Quick attack
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      // Smooth exponential decay
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // A pleasant double chime (like an iOS/Samsung notification)
    const now = ctx.currentTime;
    playNote(880, now, 0.4);       // A5 note
    playNote(1108.73, now + 0.15, 0.6); // C#6 note
  } catch (e) {
    console.error("Audio not supported");
  }
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    
    // Play the signature 'truong' sound
    playTruongSound();

    // Auto dismiss
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-24 right-4 z-[99999] flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((notif) => {
            const isSuccess = notif.type === 'success';
            const isAi = notif.type === 'ai';
            const isMilestone = notif.type === 'milestone';

            let Icon = Info;
            if (isSuccess) Icon = CheckCircle;
            if (isAi) Icon = Bell;
            if (isMilestone) Icon = Award;

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className={`relative overflow-hidden rounded-2xl shadow-xl border p-4 backdrop-blur-xl flex gap-4 items-start ${
                  isSuccess 
                    ? 'bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-100'
                    : isAi
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100'
                    : isMilestone
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100'
                    : 'bg-white/80 dark:bg-black/80 border-black/5 dark:border-white/10 text-slate-800 dark:text-slate-200'
                }`}
              >
                {/* Specifically request green circular box for success */}
                <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full ${
                  isSuccess ? 'bg-green-500 text-white w-10 h-10 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                  isAi ? 'bg-blue-500 text-white w-8 h-8' :
                  isMilestone ? 'bg-purple-500 text-white w-10 h-10 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                  'bg-slate-200 dark:bg-white/20 w-8 h-8'
                }`}>
                  <Icon className={isSuccess || isMilestone ? 'w-5 h-5' : 'w-4 h-4'} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold tracking-wide">{notif.title}</h4>
                  <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>

                <button 
                  onClick={() => removeNotification(notif.id)}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
