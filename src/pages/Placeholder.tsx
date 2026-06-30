import React from "react";
import { useLocation } from "react-router-dom";

export function Placeholder() {
  const location = useLocation();
  const path = location.pathname.replace("/", "").replace("-", " ");
  
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <span className="text-3xl">🚧</span>
      </div>
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4 capitalize">{path || "Coming Soon"}</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        This section is currently under construction. Check back soon for updates to the Civetra platform.
      </p>
    </div>
  );
}
