import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Moon, Mail, MapPin, Shield } from "lucide-react";
import { motion } from "motion/react";
import clsx from "clsx";

export function Settings() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    locationServices: true,
    privacyMode: false,
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

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Settings</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        
        {/* Dark Mode */}
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Dark Mode</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Toggle dark appearance</p>
            </div>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className={clsx(
              "w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-brand",
              isDark ? "bg-blue-600 dark:bg-brand" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <motion.div 
              initial={false}
              animate={{ x: isDark ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        {/* Push Notifications */}
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-brand">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Push Notifications</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts for new reports near you</p>
            </div>
          </div>
          <button 
            onClick={() => toggleSetting('pushNotifications')}
            className={clsx(
              "w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-brand",
              settings.pushNotifications ? "bg-blue-600 dark:bg-brand" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <motion.div 
              initial={false}
              animate={{ x: settings.pushNotifications ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        {/* Email Notifications */}
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Email Notifications</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive weekly summaries and important updates</p>
            </div>
          </div>
          <button 
            onClick={() => toggleSetting('emailNotifications')}
            className={clsx(
              "w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-brand",
              settings.emailNotifications ? "bg-blue-600 dark:bg-brand" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <motion.div 
              initial={false}
              animate={{ x: settings.emailNotifications ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        {/* Location Services */}
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Location Services</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Allow app to access your location for reporting</p>
            </div>
          </div>
          <button 
            onClick={() => toggleSetting('locationServices')}
            className={clsx(
              "w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-brand",
              settings.locationServices ? "bg-blue-600 dark:bg-brand" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <motion.div 
              initial={false}
              animate={{ x: settings.locationServices ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        {/* Privacy Mode */}
        <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Privacy Mode</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hide your profile from public leaderboards</p>
            </div>
          </div>
          <button 
            onClick={() => toggleSetting('privacyMode')}
            className={clsx(
              "w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-brand",
              settings.privacyMode ? "bg-blue-600 dark:bg-brand" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <motion.div 
              initial={false}
              animate={{ x: settings.privacyMode ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
