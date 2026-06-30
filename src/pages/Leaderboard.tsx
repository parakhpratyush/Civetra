import React, { useState, useEffect } from "react";
import { Trophy, Award, Download, Medal, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export function Leaderboard() {
  const { isDark } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const fetchedUsers: any[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() });
      });
      
      const sorted = fetchedUsers
        .filter(u => u.points && u.points > 0)
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .map(u => ({
          ...u,
          name: u.name || "Anonymous",
          role: u.role === 'admin' ? "Command Lead" : "Civic Champion",
          badges: u.badges || [],
          points: u.points || 0
        }));
        
      setUsers(sorted);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full min-h-screen pt-20 pb-32 px-6 md:px-12 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto w-full">
        
        <h1 className="text-4xl md:text-6xl tracking-tighter uppercase mb-12">
          {isDark ? (
            <span className="font-sans font-bold">Civic Leaderboard</span>
          ) : (
            <span className="font-serif italic tracking-tight font-medium normal-case">Top Citizens</span>
          )}
        </h1>

        <div className="grid grid-cols-1 gap-4">
          {users.length === 0 ? (
            <div className={`text-center p-12 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
              <h3 className={`text-xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No Active Leaders Yet</h3>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Report your first issue or volunteer to become the very first Top Citizen!</p>
            </div>
          ) : (
            users.slice(0, 5).map((user, i) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${i === 0 ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-amber-600 text-amber-100' : isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>
                    #{i + 1}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</h3>
                    <p className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>{user.role}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <div className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.points}</div>
                    <div className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-white/40' : 'text-black/40'}`}>Impact Points</div>
                  </div>
                  {/* Certificate button moved to Profile */}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Runner-ups Section (6 to N) */}
        {users.length > 5 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 border-t pt-12 border-black/10 dark:border-white/10"
          >
            <h3 className="text-sm font-bold tracking-widest uppercase mb-8 text-black/50 dark:text-white/50">Other Contributors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.slice(5).map((user, i) => (
                <div key={user.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-black/40 dark:text-white/40 w-6">#{i + 6}</span>
                    <div>
                      <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-black'}`}>{user.name}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>{user.points}</span>
                    <p className="text-[8px] uppercase tracking-widest text-emerald-500 font-bold">Impact</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>

      {/* Certificate Modal moved to Profile */}

    </div>
  );
}
