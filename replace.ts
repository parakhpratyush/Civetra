import fs from 'fs';

function replaceFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/text-brand dark:text-brand-dark/g, 'text-blue-600 dark:text-cm-brand');
  content = content.replace(/bg-brand dark:bg-brand-dark/g, 'bg-blue-600 dark:bg-cm-brand');
  content = content.replace(/dark:focus:ring-brand/g, 'dark:focus:ring-cm-brand');
  content = content.replace(/dark:bg-brand([^a-zA-Z0-9_-])/g, 'dark:bg-cm-brand$1');
  content = content.replace(/dark:text-brand([^a-zA-Z0-9_-])/g, 'dark:text-cm-brand$1');
  content = content.replace(/bg-brand\/5/g, 'bg-blue-600/5 dark:bg-cm-brand/5');
  
  // also handle cm-bg, cm-surface, etc.
  content = content.replace(/dark:bg-black(\/[0-9]+)?/g, 'dark:bg-cm-bg$1');
  content = content.replace(/dark:bg-slate-900(\/[0-9]+)?/g, 'dark:bg-cm-surface$1');
  content = content.replace(/dark:border-slate-800/g, 'dark:border-cm-border');
  content = content.replace(/dark:border-slate-700/g, 'dark:border-cm-border');
  content = content.replace(/dark:text-white/g, 'dark:text-cm-text');
  content = content.replace(/dark:text-slate-100/g, 'dark:text-cm-text');
  content = content.replace(/dark:text-slate-400/g, 'dark:text-cm-muted');
  content = content.replace(/dark:text-slate-300/g, 'dark:text-cm-text');
  content = content.replace(/dark:text-slate-500/g, 'dark:text-cm-muted');
  
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/App.tsx');
replaceFile('src/pages/Dashboard.tsx');
