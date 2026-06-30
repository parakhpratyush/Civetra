import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  helpline: string;
  setHelpline: (num: string) => void;
  supportEmail: string;
  setSupportEmail: (email: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    // Respect system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Settings with localStorage/sessionStorage persistence
  const [language, setLanguage] = useState(() => {
    return sessionStorage.getItem('civetra_session_lang') || localStorage.getItem('civetra_admin_lang') || 'English';
  });
  const [helpline, setHelpline] = useState(() => localStorage.getItem('civetra_help') || '112');
  const [supportEmail, setSupportEmail] = useState(() => localStorage.getItem('civetra_email') || 'support@civetra.org');

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const applyGoogleTranslate = (langName: string) => {
    const langCodeMap: Record<string, string> = {
      "English": "en",
      "Hindi": "hi",
      "Urdu": "ur",
      "Telugu": "te",
      "Tamil": "ta",
      "Spanish": "es",
      "French": "fr",
      "German": "de",
      "Mandarin": "zh-CN",
      "Arabic": "ar"
    };
    const code = langCodeMap[langName] || 'en';
    
    if (code === 'en') {
      let needsReload = false;
      if (document.cookie.includes('googtrans')) {
        needsReload = true;
        // Bulletproof cookie deletion for all possible localhost/domain combinations
        const hostname = window.location.hostname;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
      }
      
      // If we cleared a cookie, reload to completely purge Google Translate from the DOM
      if (needsReload) {
        window.location.reload();
      }
      
      // CRITICAL: Return early! Do NOT attempt to set select.value = 'en'. 
      // Google Translate removes 'en' from its dropdown when the source is English.
      // Trying to set it to 'en' causes it to default to the 1st alphabetical option: Abkhaz!
      return; 
    } else {
      // Set google translate cookie for auto-translation on reload
      document.cookie = `googtrans=/en/${code}; path=/`;
    }
    
    // Attempt programmatic trigger without reload if possible
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event('change'));
    } else if (langName !== 'English') {
      // First time selecting a language might need a reload to load Google scripts
      window.location.reload();
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'civetra_admin_lang' && !sessionStorage.getItem('civetra_session_lang')) {
        setLanguage(e.newValue || 'English');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    // Admin language is saved in AdminDashboard.tsx
    // User session language is explicitly saved in Layout.tsx
    applyGoogleTranslate(language);
    
    localStorage.setItem('civetra_help', helpline);
    localStorage.setItem('civetra_email', supportEmail);
  }, [language, helpline, supportEmail]);

  return (
    <ThemeContext.Provider value={{ 
      isDark, toggleTheme, 
      language, setLanguage, 
      helpline, setHelpline, 
      supportEmail, setSupportEmail 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
