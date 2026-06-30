import React from "react";
import { HelpCircle } from "lucide-react";
import { motion } from "motion/react";

export function Support() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Help & Support</h1>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <h3 className="font-bold text-lg mb-4 dark:text-slate-100">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
            <p className="font-bold mb-2 dark:text-slate-200">How do I track my issue?</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">You can view the status of your reported issues in the "My Reports" tab.</p>
          </div>
          <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
            <p className="font-bold mb-2 dark:text-slate-200">Who fixes the reported issues?</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Reports are verified and forwarded to the respective municipal departments for resolution.</p>
          </div>
        </div>
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4 dark:text-slate-100">Contact Us</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Need further assistance? Our support team is here to help.</p>
          <button className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-white transition">Send us a message</button>
        </div>
      </div>
    </motion.div>
  );
}
