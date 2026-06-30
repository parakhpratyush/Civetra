import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const MILESTONES = [1, 5, 10, 15, 20, 30, 40, 50, 100, 200, 500, 1000];

export const StatusListener = () => {
  const { showNotification } = useNotification();
  const { currentUser, userProfile, isAdmin } = useAuth();
  const location = useLocation();
  const [earnedBadge, setEarnedBadge] = useState<number | null>(null);
  
  // Track previous state of issues to detect changes
  const prevIssuesRef = useRef<Record<string, { status: string, authorId: string }>>({});
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const q = query(collection(db, "issues"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const currentIssues: Record<string, { status: string, authorId: string }> = {};
      let userResolvedCount = 0;

      snapshot.forEach((document) => {
        const data = document.data();
        const status = data.status || 'reported';
        const authorId = data.authorId || 'anonymous';
        currentIssues[document.id] = { status, authorId };
        
        if (status === 'resolved' && currentUser && authorId === currentUser.uid) {
          userResolvedCount++;
        }
      });

      if (initialLoadRef.current) {
        prevIssuesRef.current = currentIssues;
        initialLoadRef.current = false;
        return;
      }

      // 1. Check for status transitions (Only notify if the user reported this issue)
      if (!isAdmin && currentUser) {
        Object.keys(currentIssues).forEach(id => {
          const prev = prevIssuesRef.current[id];
          const curr = currentIssues[id];

          if (prev && prev.status !== curr.status && curr.authorId === currentUser.uid) {
            // Status changed!
            let message = '';
            if (curr.status === 'verified') {
              message = 'Your reported issue has been verified by the authorities.';
            } else if (curr.status === 'in_progress') {
              message = 'Work has begun on your reported issue.';
            } else if (curr.status === 'resolved') {
              message = 'Your reported issue has been successfully resolved. Thank you!';
            }

            if (message) {
              showNotification(`Status Update: ${curr.status.toUpperCase()}`, message, 'success');
            }
          }
        });
      }

      // 2. Check for Gamification Milestones (issues resolved by THIS user)
      if (!isAdmin && currentUser && userProfile) {
        if (MILESTONES.includes(userResolvedCount)) {
          // Has the user already earned this badge?
          if (!userProfile.badges.includes(userResolvedCount)) {
            // Give them the badge!
            setEarnedBadge(userResolvedCount);
            showNotification('Achievement Unlocked!', `You earned the ${userResolvedCount === 1 ? 'Newbie' : userResolvedCount + ' Problems Solved'} badge!`, 'milestone');
            
            // Persist to user profile
            const userRef = doc(db, userProfile.docCollection, currentUser.uid);
            try {
              await updateDoc(userRef, { badges: arrayUnion(userResolvedCount) });
            } catch (err) {
              console.error("Failed to save badge to profile", err);
            }
          }
        }
      }

      prevIssuesRef.current = currentIssues;
    });

    return () => unsubscribe();
  }, [showNotification, currentUser, userProfile, isAdmin]);

  const closeBadge = () => setEarnedBadge(null);

  return (
    <AnimatePresence>
      {earnedBadge !== null && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center pointer-events-auto">
          {/* Backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeBadge}
          />
          
          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="relative bg-white dark:bg-slate-900 border border-purple-500/30 p-10 rounded-[2rem] shadow-2xl max-w-sm w-full mx-4 text-center overflow-hidden"
          >
            {/* Glowing orb background effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[64px] rounded-full pointer-events-none" />
            
            <button 
              onClick={closeBadge}
              className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/5 rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.5)] mb-6">
                <Award className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold font-serif mb-2 text-slate-800 dark:text-white">
                {earnedBadge === 1 ? 'Newbie Badge' : `${earnedBadge} Solved Badge`}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
                {earnedBadge === 1 
                  ? "Congratulations on solving your first issue! You've taken the first step towards improving your community."
                  : `Incredible! You've successfully resolved ${earnedBadge} issues. Your dedication to the community is unmatched.`}
              </p>
              
              <button 
                onClick={closeBadge}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-colors"
              >
                Continue Impacting
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
