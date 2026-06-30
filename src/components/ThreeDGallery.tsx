import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Issue } from '../types';

interface ThreeDGalleryProps {
  issues: Issue[];
  isDark: boolean;
}

// 6 faces of the cube, each with a rotation to position it
const FACE_TRANSFORMS = [
  { rx: 0,   ry: 0,   rz: 0 },   // front
  { rx: 0,   ry: 90,  rz: 0 },   // right
  { rx: 0,   ry: 180, rz: 0 },   // back
  { rx: 0,   ry: -90, rz: 0 },   // left
  { rx: 90,  ry: 0,   rz: 0 },   // top
  { rx: -90, ry: 0,   rz: 0 },   // bottom
];

// Predefined target rotations for the entire cube to face a specific direction
const TARGET_ROTATIONS = [
  { x: -15, y: -25 }, // Shows front, right, top slightly
  { x: -15, y: -115 }, // Shows right
  { x: -15, y: -205 }, // Shows back
  { x: -15, y: -295 }, // Shows left
  { x: -65, y: -25 }, // Shows top
  { x: 45,  y: -25 }, // Shows bottom
];

export function ThreeDGallery({ issues, isDark }: ThreeDGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Base rotation targets for the cube to face the active item
  const [targetRotation, setTargetRotation] = useState({ x: -25, y: -45 });
  // Current actual rotation (smoothed)
  const [currentRotation, setCurrentRotation] = useState({ x: -25, y: -45 });
  
  // Mouse parallax offsets
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  // Smooth animation loop for cube rotation and parallax
  useEffect(() => {
    let autoRotationY = 0;
    const animate = () => {
      autoRotationY += 0.2; // Slow continuous spin
      
      setCurrentRotation(prev => {
        const ease = 0.05;
        const nextX = prev.x + (targetRotation.x - prev.x) * ease;
        const nextY = prev.y + (targetRotation.y - prev.y) * ease + 0.2; // Add constant spin
        return { x: nextX, y: nextY };
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetRotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ((e.clientX - cx) / rect.width) * 40; 
    const dy = ((e.clientY - cy) / rect.height) * 40;
    setMouseOffset({ x: dx, y: -dy }); 
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseOffset({ x: 0, y: 0 });
  }, []);

  const handleHoverList = (index: number) => {
    setActiveIndex(index);
    const target = TARGET_ROTATIONS[index % 6];
    // Add variations so it continues spinning if we go down a long list
    const multiplier = Math.floor(index / 6);
    setTargetRotation({ 
      x: target.x, 
      y: target.y - (multiplier * 360)
    });
  };

  const handleClickIssue = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  if (issues.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-black rounded-3xl">
        <p className="text-white/40 font-mono">No issues to display.</p>
      </div>
    );
  }

  const finalRotateX = currentRotation.x + mouseOffset.y;
  const finalRotateY = currentRotation.y + mouseOffset.x;

  const CUBE_SIZE = 400;
  const HALF_SIZE = CUBE_SIZE / 2;

  const gridSize = useMemo(() => {
    if (issues.length <= 1) return 1;
    if (issues.length <= 4) return 2;
    if (issues.length <= 9) return 3;
    return 4; // cap at 4x4
  }, [issues.length]);

  const tilesPerFace = gridSize * gridSize;
  const totalTiles = 6 * tilesPerFace;

  const tileIssues = useMemo(() => {
    const sorted = [...issues].sort((a, b) => {
      const timeA = a.reportedAt?.toMillis ? a.reportedAt.toMillis() : 0;
      const timeB = b.reportedAt?.toMillis ? b.reportedAt.toMillis() : 0;
      return timeB - timeA;
    });
    
    const result: Issue[] = [];
    for (let i = 0; i < totalTiles; i++) {
      if (sorted.length > 0) result.push(sorted[i % sorted.length]);
    }
    return result;
  }, [issues, totalTiles]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-[750px] bg-[#050505] rounded-[40px] overflow-hidden relative font-sans flex shadow-2xl border border-white/5"
    >
      {/* Background Graphic - Glassy Outlined L */}
      <div 
        className="absolute left-[-5%] top-[10%] font-black tracking-tighter select-none pointer-events-none z-0" 
        style={{ 
          fontSize: '600px', 
          lineHeight: 0.75, 
          letterSpacing: '-0.08em',
          color: 'transparent',
          WebkitTextStroke: '2px rgba(255, 67, 0, 0.15)',
          opacity: 0.8
        }}
      >
        L
      </div>

      <div className="absolute top-10 left-10 text-white/40 text-xs font-mono tracking-widest flex flex-col gap-1">
        <span>Civetra Platform</span>
        <span>Issue N°003 / Coll. 2026</span>
        <span>Ref. EDI-032026-R02</span>
      </div>

      {/* Ambient Background Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ 
          background: `radial-gradient(circle, ${isDark ? '#ff4300' : '#ff4300'}, transparent 70%)`,
          animation: 'pulse 8s infinite alternate'
        }}
      />

      <div className="absolute top-10 right-[400px] text-white/40 text-xs tracking-widest">
        Featured Works, Archive, About
      </div>

      {/* ── LEFT/CENTER: 3D CUBE ── */}
      <div className="flex-1 h-full flex items-center justify-center relative" style={{ perspective: '2000px' }}>
        <div
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${finalRotateX}deg) rotateY(${finalRotateY}deg)`,
          }}
          className="relative cursor-pointer"
        >
          {FACE_TRANSFORMS.map((face, faceIndex) => {
            return (
              <div
                key={faceIndex}
                className="absolute top-0 left-0 bg-transparent"
                style={{
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  transform: `rotateX(${face.rx}deg) rotateY(${face.ry}deg) translateZ(${HALF_SIZE}px)`,
                  backfaceVisibility: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                  gap: '2px', // Thin gap between tiles
                  background: 'transparent'
                }}
              >
                {/* Dynamic Tiles per face */}
                {Array.from({ length: tilesPerFace }).map((_, tileIndex) => {
                  const globalIndex = faceIndex * tilesPerFace + tileIndex;
                  const issue = tileIssues[globalIndex];
                  const activeIssue = issues.length > 0 ? issues[activeIndex % issues.length] : null;
                  const isHoveredIssue = activeIssue && issue && activeIssue.id === issue.id;
                  const photo = issue?.mediaUrls?.[0];
                  return (
                    <div 
                      key={tileIndex} 
                      className={`w-full h-full relative overflow-hidden group transition-all duration-500 ${isHoveredIssue ? 'z-20 scale-105 shadow-[0_0_30px_rgba(255,67,0,0.5)] border-2 border-[#ff4300]' : 'z-10 opacity-40 grayscale-[0.5]'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (issue) handleClickIssue(issue);
                      }}
                    >
                      {photo ? (
                        <img 
                          src={photo} 
                          alt="" 
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <span className="text-xl opacity-20">📌</span>
                        </div>
                      )}
                      
                      {isHoveredIssue && (
                        <div className="absolute inset-0 bg-gradient-to-t from-[#ff4300]/40 to-transparent pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Minimalist Scrollable List ── */}
      <div className="w-[320px] h-full overflow-y-auto overflow-x-hidden flex flex-col py-20 pr-8 relative z-10 custom-scrollbar">
        <div className="flex flex-col gap-0.5">
          {issues.map((issue, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={index}
                onMouseEnter={() => handleHoverList(index)}
                onClick={() => handleClickIssue(issue)}
                className="group cursor-pointer flex items-center gap-3 py-1.5 transition-all duration-300 relative"
              >
                {/* Minimalist dot indicator */}
                <span 
                  className="absolute left-0 w-1.5 h-1.5 rounded-none bg-[#ff4300] transition-opacity duration-300"
                  style={{ opacity: isActive ? 1 : 0, transform: 'translateY(1px)' }}
                />
                
                <p 
                  className={`text-sm font-light transition-all duration-300 pl-4 whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}
                >
                  {issue.title || "Untitled Issue"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Full-screen detail overlay ── */}
      {selectedIssue && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-8"
          style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)' }}
          onClick={() => setSelectedIssue(null)}
        >
          <div className="max-w-5xl w-full flex flex-col md:flex-row gap-8 items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-1/2 aspect-square bg-white/5 rounded-none overflow-hidden shadow-2xl">
              {selectedIssue.mediaUrls?.[0] ? (
                <img src={selectedIssue.mediaUrls[0]} alt={selectedIssue.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <span className="text-8xl opacity-20">📌</span>
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 text-white">
              <p className="text-[#ff4300] uppercase tracking-widest text-sm font-bold mb-2">{selectedIssue.category}</p>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight tracking-tight">{selectedIssue.title}</h2>
              <p className="text-white/50 text-lg mb-6">{selectedIssue.location?.address}</p>
              <p className="text-white/80 text-base leading-relaxed mb-8">{selectedIssue.description || "No detailed description provided."}</p>
              <div className="inline-block px-4 py-2 border border-white/20 rounded-none text-xs uppercase tracking-widest">
                Status: {selectedIssue.status.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button 
            className="absolute top-8 right-8 text-white/50 hover:text-white text-4xl font-light"
            onClick={() => setSelectedIssue(null)}
          >
            ×
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.1; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.2); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
