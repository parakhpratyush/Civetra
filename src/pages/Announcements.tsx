import React from "react";
import { Megaphone } from "lucide-react";
import { motion } from "motion/react";

export function Announcements() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
          <Megaphone className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">City Updates</h1>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-lg mb-2 dark:text-slate-100">Update #{i}: Scheduled Maintenance</h3>
            <p className="text-slate-600 dark:text-slate-400">The city water department will be conducting routine maintenance this weekend.</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
