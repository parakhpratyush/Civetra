import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { FALLBACK_QA } from '../data/fallbackChat';

export default function Chatbot() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hi, I am CivicBot. How can I help you understand or report civic issues today?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessageText = input.trim();
    const userMessage = { role: 'user', text: userMessageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessageText, history: messages })
      });
      
      if (!res.ok) throw new Error('Backend unavailable');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || "Sorry, I couldn't process that." }]);
    } catch (error) {
      console.warn("Chatbot backend unavailable, trying local fallback...");
      
      const lowerInput = userMessageText.toLowerCase();
      let fallbackMatch = FALLBACK_QA.find(qa => qa.pattern.test(lowerInput));
      
      if (fallbackMatch) {
        setMessages(prev => [...prev, { role: 'bot', text: fallbackMatch!.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "I'm currently in 'Static Mode' without my full AI Brain. I can answer basic questions about Civetra, but for full AI conversation, please use our primary link: https://civetra-ai-brain--civetra.us-east4.hosted.app" 
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[300] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`absolute bottom-20 right-0 w-[90vw] max-w-[360px] h-[500px] flex flex-col rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl ${isDark ? 'bg-[#030308]/90 border-white/20 text-[#e2e2e4]' : 'bg-[#FAFAF8]/95 border-black/10 text-[#1a1a1a]'}`}
          >
            {/* Header */}
            <div className={`px-4 py-4 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-sm tracking-widest uppercase">CivicBot</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:opacity-50 transition-opacity ">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? (isDark ? 'bg-primary text-[#030308]' : 'bg-[#1a1a1a] text-[#FAFAF8]') 
                      : (isDark ? 'bg-white/10' : 'bg-black/5')
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t flex gap-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'}`}>
              <input 
                id="chatbot-query-input"
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about civic issues..."
                className={`flex-1 bg-transparent px-3 py-2 outline-none text-sm placeholder:opacity-50 ${isDark ? 'text-white' : 'text-black'}`}
                title="Type your question for CivicBot"
                aria-label="Ask CivicBot"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                title="Send your message to CivicBot"
                aria-label="Send Message"
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${!input.trim() || isLoading ? 'opacity-50 opacity-50' : 'hover:scale-110 '} ${isDark ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-white'}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHovered && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`absolute right-20 bottom-3 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-2xl border whitespace-nowrap pointer-events-none ${isDark ? 'bg-[#030308]/90 border-white/20 text-white' : 'bg-white/90 border-black/10 text-black'}`}
          >
            Chat with Civetra
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors outline-none focus:outline-none focus:ring-0 overflow-hidden ${isDark ? 'border-white/20 bg-black/50 text-white hover:bg-white/10' : 'border-black/10 bg-white/80 text-black hover:bg-black/5'}`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243-2.829a4 4 0 110-5.656m0 5.656l2.829 2.829M12 12v9" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
