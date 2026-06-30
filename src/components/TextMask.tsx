import React from 'react';

interface TextMaskProps {
  text: string;
  videoSrc: string;
  isDark: boolean;
}

export function TextMask({ text, videoSrc, isDark }: TextMaskProps) {
  return (
    <div className="relative w-full h-[100vh] flex items-center justify-center overflow-hidden bg-black select-none">
      
      {/* Background Video */}
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      
      {/* 
        Mix-Blend-Mode Magic:
        Dark Mode: bg-black with text-white and 'multiply'. Black stays black, white becomes transparent.
        Light Mode: bg-white with text-black and 'screen'. White stays white, black becomes transparent.
      */}
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${isDark ? 'bg-black mix-blend-multiply' : 'bg-white mix-blend-screen'}`}>
        <h2 className={`text-sm md:text-xl tracking-[0.5em] font-serif uppercase mb-4 opacity-80 ${isDark ? 'text-white' : 'text-black'}`}>
          Into The
        </h2>
        <h1 className={`text-[15vw] font-serif font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
          {text}
        </h1>
      </div>

    </div>
  );
}
