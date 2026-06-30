import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Shield, Activity, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { HeroModel } from '../components/HeroModel';

export default function Home() {
  const { isDark } = useTheme();
  const { isAdmin, userProfile } = useAuth();

  if (isDark) {
    // --- CLEVER MELLOW EXTENDED DARK HERO EXPERIMENTAL ---
    return (
      <div className="w-full relative overflow-x-hidden bg-transparent text-[#F5F5F7]">
        <section className="w-full flex justify-between items-center px-4 md:px-16 pt-20 pb-32 font-['Space+Grotesk'] text-[#F5F5F7]">
          {/* Dynamic Abstract Background Blob Glow */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full filter blur-[120px] mix-overlay animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-900/10 rounded-full filter blur-[150px] mix-overlay pointer-events-none" />

          <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-12 items-center z-10 px-12">
            {/* Typography Block */}
            <div className="col-span-12 lg:col-span-7 space-y-8">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-6xl lg:text-[80px] font-bold tracking-tighter leading-[0.9] uppercase cursor-default"
              >
                Every issue <br />
                <motion.span 
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-gray-700 via-gray-300 to-gray-700 inline-block transition-transform duration-300 whitespace-nowrap"
                >
                  deserves a
                </motion.span> <br />
                civic stage.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-xl md:text-2xl text-gray-400 font-serif leading-relaxed max-w-2xl"
              >
                Transforming distributed public failures into verified digital infrastructure realities. Powered by machine intelligence.
              </motion.p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-12 w-full pt-6">
                {(!userProfile || userProfile.role !== 'admin') && (
                  <Link to="/report" className="w-full sm:w-auto">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"
                    >
                      Report Issue
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                )}
                <Link to="/map" className="w-full sm:w-auto">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  >
                    View Map
                    <MapPin className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* 3D Hero Model Block */}
            <div className="col-span-12 lg:col-span-5 relative flex flex-col items-center justify-center">
              <HeroModel />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute bottom-10 px-6 py-4 text-center max-w-[80%]"
              >
                <p className="text-white/60 font-bold text-sm tracking-widest uppercase leading-relaxed">
                  Be a hero by resolving issues of your community.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative z-10 py-12 px-8 w-full border-t border-white/5 flex justify-center">
          <div className="grid grid-cols-3 gap-12 w-full max-w-7xl mx-auto">
            {[
              {
                icon: <Activity className="w-8 h-8 text-blue-500 mb-6" />,
                title: "Live Telemetry",
                desc: "Experience urban infrastructure data through our advanced 3D WebGL dashboard."
              },
              {
                icon: <MapPin className="w-8 h-8 text-purple-500 mb-6" />,
                title: "Map 1",
                desc: "Pinpoint civic issues with exact coordinates and interactive map visualizations."
              },
              {
                icon: <Shield className="w-8 h-8 text-green-500 mb-6" />,
                title: "Verified Trust",
                desc: "Every report is verified through the Civetra Trust Engine to prevent spam and ensure accuracy."
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="p-8"
              >
                {feature.icon}
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="opacity-70 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // --- AIKA WAKENICHI ULTRA LIGHT EDITORIAL HERO ---
  return (
    <div className="w-full relative overflow-x-hidden bg-transparent text-[#0A0A0B]">
      <section className="w-full flex flex-col justify-center px-4 md:px-16 pt-20 pb-24 font-['Playfair+Display']">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          {/* Centered Editorial Structural Head */}
          <div className="space-y-8 md:space-y-12 flex flex-col items-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-[80px] font-light italic leading-[1.2] tracking-tight cursor-default px-4 max-w-5xl mx-auto"
            >
              <motion.span whileHover={{ paddingLeft: "10px", color: "#333" }} className="inline-block transition-all duration-300 break-words whitespace-normal">Systemic transparency,</motion.span> <br className="hidden sm:block" />
              <motion.span whileHover={{ letterSpacing: "1px", color: "#000" }} className="font-semibold not-italic tracking-tighter inline-block transition-all duration-300 break-words whitespace-normal">mapped elegantly</motion.span> <motion.span whileHover={{ opacity: 0.6 }} className="inline-block transition-opacity duration-300 break-words whitespace-normal">across the public domain.</motion.span>
            </motion.h1>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mt-12 font-sans">
              {(userProfile?.role !== 'admin') && (
                <Link to="/report" className="w-full sm:w-auto">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30"
                  >
                    Report Issue
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              )}
              <Link to="/map" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all border border-black/20 flex items-center justify-center gap-3 bg-transparent text-black hover:bg-black/5"
                >
                  View Map
                  <MapPin className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
        </div>
      </div>

      {/* Full-Bleed Parallax Civic Frame Simulation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="w-full max-w-7xl mx-auto h-[45vh] bg-[#F1F1ED] border border-black/10 mt-12 mb-0 relative overflow-hidden flex items-center justify-center group cursor-pointer rounded-2xl"
        >
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
          >
            <source src="https://videos.pexels.com/video-files/3121459/3121459-uhd_2560_1440_24fps.mp4" type="video/mp4" />
          </video>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-12 px-8 w-full border-t border-black/5 font-sans flex justify-center mt-8">
        <div className="grid grid-cols-3 gap-12 w-full max-w-7xl mx-auto">
          {[
            {
              icon: <Activity className="w-8 h-8 text-blue-500 mb-6" />,
              title: "Live Telemetry",
              desc: "Experience urban infrastructure data through our advanced 3D WebGL dashboard."
            },
            {
              icon: <MapPin className="w-8 h-8 text-purple-500 mb-6" />,
              title: "Map 1",
              desc: "Pinpoint civic issues with exact coordinates and interactive map visualizations."
            },
            {
              icon: <Shield className="w-8 h-8 text-green-500 mb-6" />,
              title: "Verified Trust",
              desc: "Every report is verified through the Civetra Trust Engine to prevent spam and ensure accuracy."
            }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="p-8"
            >
              {feature.icon}
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="opacity-70 leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
