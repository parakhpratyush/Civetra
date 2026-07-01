import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UploadCloud, MapPin, Send, Loader2, FileText, CheckCircle, Layers, AlertTriangle, Navigation, Camera, X, Plus } from "lucide-react";
import clsx from "clsx";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { ISSUE_CATEGORIES } from "../types";
import { useTheme } from "../ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";

const playSuccessSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio not supported");
  }
};

function MapUpdater({ center }: { center: { lat: number, lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

function ZoomLimiter({ mapType, onLimitReached }: { mapType: "basic" | "satellite", onLimitReached: () => void }) {
  const map = useMap();
  const maxZoom = mapType === "satellite" ? 19 : 22;

  useEffect(() => {
    map.setMaxZoom(maxZoom);
    const container = map.getContainer();
    let touchDistance = 0;

    const triggerLimit = () => {
      onLimitReached();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && map.getZoom() >= maxZoom) {
        triggerLimit();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && map.getZoom() >= maxZoom) {
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (currentDistance > touchDistance + 10) {
          triggerLimit();
          touchDistance = currentDistance;
        }
      }
    };

    const handleDoubleClick = () => {
      if (map.getZoom() >= maxZoom) {
         triggerLimit();
      }
    };
    
    const handleControlClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.leaflet-control-zoom-in') && map.getZoom() >= maxZoom) {
        triggerLimit();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('dblclick', handleDoubleClick, { passive: true });
    container.addEventListener('click', handleControlClick, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('click', handleControlClick);
    };
  }, [map, maxZoom, onLimitReached]);

  return null;
}

function LocationPicker({ setCoordinates, setLocationName }: { setCoordinates: (c: {lat: number, lng: number}) => void, setLocationName: (n: string) => void }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setCoordinates({ lat, lng });
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setLocationName(data.display_name);
          } else {
            setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        })
        .catch(() => {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });
    },
  });
  return null;
}

export function ReportIssue() {
  const { isDark } = useTheme();
  const { showNotification } = useNotification();
  const { currentUser, userProfile } = useAuth();
  const [description, setDescription] = useState("");
  interface MediaFile {
    data: string;
    type: string;
    name: string;
  }
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  const getTotalSize = (files: MediaFile[]) => {
    return files.reduce((acc, file) => acc + (file.data.length * (3/4)), 0);
  };
  const MAX_TOTAL_SIZE = 800 * 1024; // 800 KB

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [locationName, setLocationName] = useState("Waiting for location...");
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mapType, setMapType] = useState<"basic" | "satellite">("basic");
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const warningTimeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Camera access denied or unavailable. Make sure you are using HTTPS and have granted permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // Compress snapshot
        const newFile = { data: dataUrl, type: "image/jpeg", name: "snapshot.jpg" };
        if (getTotalSize([...mediaFiles, newFile]) <= MAX_TOTAL_SIZE) {
          setMediaFiles(prev => [...prev, newFile]);
        } else {
          alert("Total media size exceeds 800KB limit to prevent database crash. Please remove some files.");
        }
      }
    }
    stopCamera();
  };

  const handleZoomLimitReached = () => {
    setShowZoomWarning(true);
    if (navigator.vibrate) navigator.vibrate(200);
    
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = window.setTimeout(() => {
      setShowZoomWarning(false);
    }, 2000);
  };

  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY || "qKqvvu1BGebLyTDHPbMupT2g45XJVZm7";
  const tileUrl = mapType === "basic" 
    ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${apiKey}`
    : `https://api.tomtom.com/map/1/tile/sat/main/{z}/{x}/{y}.jpg?key=${apiKey}`;

  const userIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>`,
    className: "custom-leaflet-user-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    let newFiles: MediaFile[] = [];
    let currentTotal = getTotalSize(mediaFiles);
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result as string;
        const estimatedSize = fileData.length * (3/4);
        if (currentTotal + estimatedSize <= MAX_TOTAL_SIZE) {
          currentTotal += estimatedSize;
          setMediaFiles(prev => [...prev, { data: fileData, type: file.type, name: file.name }]);
        } else {
          alert(`File ${file.name} skipped: Total media size exceeds 800KB limit.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    let newFiles: MediaFile[] = [];
    let currentTotal = getTotalSize(mediaFiles);
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result as string;
        const estimatedSize = fileData.length * (3/4);
        if (currentTotal + estimatedSize <= MAX_TOTAL_SIZE) {
          currentTotal += estimatedSize;
          setMediaFiles(prev => [...prev, { data: fileData, type: file.type, name: file.name }]);
        } else {
          alert(`File ${file.name} skipped: Total media size exceeds 800KB limit.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchLocation = () => {
    setIsFetchingLocation(true);
    setLocationName("Fetching location...");
    if (!navigator.geolocation) {
      setLocationName("Geolocation not supported");
      setIsFetchingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setLocationName(data.display_name);
          } else {
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (err) {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsFetchingLocation(false);
        }
      },
      async (error) => {
        // Fallback to IP location
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            setCoordinates({ lat: data.latitude, lng: data.longitude });
            setLocationName(`${data.city || 'Unknown City'}, ${data.region || 'Unknown Region'}`);
          } else {
            setLocationName("Failed to get location");
          }
        } catch (e) {
          setLocationName("Failed to get location");
        }
        setIsFetchingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setAiAnalyzing(true);
      
      // 0. Auto-Moderation Check
      const modRes = await fetch("/api/moderate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description, imageBase64: mediaFiles[0]?.data })
      });
      const modData = await modRes.json();
      if (!modData.approved) {
        setAiAnalyzing(false);
        setIsSubmitting(false);
        showNotification("Content Rejected", modData.reason || "Your report violated community guidelines.", "error");
        return;
      }

      // 1. Ask Gemini to categorize and analyze the issue based on description and image
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, imageBase64: mediaFiles[0]?.data })
      });
      const aiData = await res.json();
      
      const { collection, addDoc, serverTimestamp, doc: firestoreDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      
      const generatedCategory = aiData.category || "Civic Report";
      const generatedSeverity = aiData.severity || "Medium";
      const generatedTitle = aiData.title || generatedCategory;
      const generatedTags = aiData.tags || [generatedCategory.toLowerCase()];
      
      // Fallback icon based on category string
      let defaultIcon = "📌";
      if (generatedCategory.toLowerCase().includes("water")) defaultIcon = "💧";
      if (generatedCategory.toLowerCase().includes("road")) defaultIcon = "🚧";
      if (generatedCategory.toLowerCase().includes("power")) defaultIcon = "⚡";
      if (generatedCategory.toLowerCase().includes("trash")) defaultIcon = "🗑️";

      const docRef = await addDoc(collection(db, "issues"), {
        title: generatedTitle,
        description,
        category: generatedCategory,
        severity: generatedSeverity,
        status: "reported",
        location: { lat: coordinates?.lat || 37.7749, lng: coordinates?.lng || -122.4194, address: locationName },
        icon: defaultIcon,
        tags: generatedTags,
        reportedAt: serverTimestamp(),
        upvotes: 0,
        verifications: 0,
        mediaUrls: mediaFiles.map(f => f.data),
        authorId: currentUser?.uid || "anonymous",
        reportedBy: userProfile?.name || "Anonymous Citizen",
        reportedByUid: currentUser?.uid || "anonymous",
      });

      showNotification("Reported successfully", "Your issue has been logged and the AI has categorized it.", "success");
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription("");
        setMediaFiles([]);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to report issue");
    } finally {
      setAiAnalyzing(false);
      setIsSubmitting(false);
    }
  };

  const isFormValid = 
    coordinates !== null && 
    description.trim() !== "" && 
    mediaFiles.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-12 w-full">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Report an Issue</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Help improve the community by reporting problems.</p>
      </div>

      <form onSubmit={handleSubmit} className={`backdrop-blur-3xl p-6 md:p-8 rounded-[2rem] shadow-sm border relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-black/5'}`}>
        
        {/* LEFT COLUMN: Media & Location */}
        <div className="space-y-8 min-w-0">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 mb-3">Evidence (Photo, Video, Document)</label>
            <div 
              className={clsx(
                "flex justify-center px-6 pt-8 pb-10 border-2 border-dashed rounded-2xl relative transition-colors bg-white dark:bg-transparent",
                isDragging ? "border-blue-500 bg-blue-50 dark:border-white/40 dark:bg-white/5" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {mediaFiles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                  {mediaFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 group">
                      {file.type?.startsWith('image/') ? (
                        <img src={file.data} alt="Preview" className="w-full h-full object-cover" />
                      ) : file.type?.startsWith('video/') ? (
                        <video src={file.data} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          <UploadCloud className="w-8 h-8 opacity-40 mb-2" />
                          <span className="text-[10px] font-bold text-center truncate w-full">{file.name}</span>
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add More Button */}
                  <label className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <Plus className="w-6 h-6 opacity-40 mb-1" />
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">Add More</span>
                    <input type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={handleFileInput} title="Add more media files" aria-label="Add more media" />
                  </label>
                </div>
              ) : showCamera ? (
                    <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover"
                        onCanPlay={() => { if(videoRef.current) videoRef.current.play(); }}
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                        <button 
                          type="button" 
                          onClick={stopCamera} 
                          className="bg-slate-800/80 backdrop-blur-md p-3 rounded-full text-white hover:bg-slate-700 transition-colors border border-white/20"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <button 
                          type="button" 
                          onClick={takeSnapshot} 
                          className="bg-blue-500 p-3 rounded-full text-white shadow-lg hover:bg-blue-600 transition-colors border-2 border-white/50"
                        >
                          <Camera className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-transparent flex items-center justify-center mb-4">
                        <UploadCloud className="h-8 w-8 text-blue-500 dark:text-white/70" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-200">Drag & drop media here</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Photos, Videos, or Documents up to 10MB</p>
                      </div>
                      <div className="flex flex-col sm:flex-row text-xs text-slate-600 dark:text-slate-400 justify-center gap-3 mt-6">
                        <label className="relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors focus-within:outline-none cursor-pointer" title="Browse your files to upload evidence">
                          <span>Browse</span>
                          <input type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={handleFileInput} aria-label="Upload evidence" />
                        </label>
                        <button 
                          type="button" 
                          onClick={startCamera} 
                          className="relative bg-blue-600 dark:bg-white dark:text-black shadow-sm px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase text-white hover:bg-blue-700 dark:hover:bg-gray-200 transition-colors focus-within:outline-none"
                        >
                          Camera
                        </button>
                      </div>
                    </div>
              )}
            </div>
          </div>

          {/* Location (Auto) */}
          <div>
             <label className="block text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 mb-3">Location Pinpoint</label>
             <div className="flex flex-col gap-3">
               <div className="w-full flex items-center gap-3 p-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                  <MapPin className="w-5 h-5 text-blue-500 dark:text-white/60 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{locationName}</span>
               </div>
               <div className="flex w-full gap-3">
                 <button
                    type="button"
                    onClick={fetchLocation}
                    disabled={isFetchingLocation}
                    className="flex-1 px-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm text-xs uppercase tracking-wider font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                 >
                    {isFetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Locate Me
                 </button>
                 <button
                    type="button"
                    onClick={() => {
                      if (!coordinates) {
                        setCoordinates({ lat: 28.6692, lng: 77.4538 }); 
                        setLocationName("Move pin to select location");
                      }
                    }}
                    className="flex-1 px-4 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl shadow-sm text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                 >
                    <Navigation className="w-4 h-4" />
                    Choose on Map
                 </button>
               </div>
             </div>
             
             {coordinates && (
               <div className="mt-4 h-[300px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative map-container-custom shadow-inner">
                 <MapContainer 
                   center={[coordinates.lat, coordinates.lng]} 
                   zoom={15} 
                   style={{ height: "100%", width: "100%" }}
                   zoomControl={false}
                   aria-label="Interactive map to select issue location"
                   title="Interactive map to select issue location"
                 >
                   <MapUpdater center={coordinates} />
                   <ZoomLimiter mapType={mapType} onLimitReached={handleZoomLimitReached} />
                   <TileLayer
                     url={tileUrl}
                     maxZoom={22}
                     attribution='&copy; <a href="https://www.tomtom.com/">TomTom</a>'
                   />
                   <Marker position={[coordinates.lat, coordinates.lng]} icon={userIcon} />
                   <LocationPicker setCoordinates={setCoordinates} setLocationName={setLocationName} />
                 </MapContainer>
                 
                 <AnimatePresence>
                   {showZoomWarning && (
                     <motion.div 
                       initial={{ opacity: 0, y: -20, scale: 0.9 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: -20, scale: 0.9 }}
                       className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-2 rounded-full shadow-lg z-[500] flex items-center gap-2 pointer-events-none backdrop-blur-sm border border-slate-700"
                     >
                       <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                       <span className="text-xs font-medium">Max zoom reached</span>
                     </motion.div>
                   )}
                 </AnimatePresence>
  
                 <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
                   <button
                     type="button"
                     onClick={(e) => {
                       e.stopPropagation();
                       setMapType(prev => prev === "basic" ? "satellite" : "basic");
                     }}
                     className="bg-white/90 dark:bg-black/60 backdrop-blur-md p-2.5 rounded-xl shadow-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-white/20 transition-colors flex items-center justify-center"
                     title="Toggle Map Type"
                   >
                     <Layers className="w-4 h-4" />
                   </button>
                 </div>
                 <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                    <div className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase text-slate-700 dark:text-white/80 shadow-sm border border-slate-200 dark:border-white/10 pointer-events-none z-10">
                      Tap map to adjust pin
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* RIGHT COLUMN: Details & Submit */}
        <div className="space-y-8 flex flex-col h-full min-w-0">
          
          <div className="bg-purple-50/50 dark:bg-purple-900/10 border-2 border-purple-500/30 p-6 rounded-2xl relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 blur-2xl rounded-full"></div>
             <div className="flex items-center gap-3 mb-2 relative z-10">
               <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" className="text-purple-600 dark:text-purple-400"/>
                 </svg>
               </div>
               <h3 className="font-bold text-purple-900 dark:text-purple-100">AI Auto-Categorization</h3>
             </div>
             <p className="text-sm font-medium text-purple-800/70 dark:text-purple-200/70 relative z-10">
               Gemini AI will automatically analyze your image or video alongside your description to instantly categorize the issue, assign severity, and generate a title.
             </p>
          </div>

          {/* Description */}
          <div className="flex-1 flex flex-col">
            <label htmlFor="description" className="block text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 mb-3">Description</label>
            <div className="mt-2 flex-1 flex">
              <textarea
                id="description"
                rows={4}
                className="block w-full flex-1 rounded-xl bg-white border-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white border p-4 shadow-sm focus:border-blue-500 dark:focus:border-white/30 focus:ring-blue-500 dark:focus:ring-white/20 sm:text-sm font-medium text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 min-h-[120px]"
                placeholder="Please describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <motion.button
              type="submit"
              whileHover={!isSubmitting && isFormValid && !isSuccess ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && isFormValid && !isSuccess ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              disabled={isSubmitting || !isFormValid || isSuccess}
              className={clsx(
                "w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold tracking-widest uppercase text-white transition-colors",
                isSuccess ? "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 shadow-green-100 dark:shadow-green-900/20" :
                isSubmitting || !isFormValid ? "bg-slate-300 dark:bg-white/5 dark:text-slate-500 opacity-50 shadow-none cursor-not-allowed" : "bg-blue-600 dark:bg-white dark:text-black hover:bg-blue-700 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-white/50 shadow-blue-100 dark:shadow-white/20 dark:ring-offset-[#050508]"
              )}
            >
              {isSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Report Submitted
                </>
              ) : aiAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI Analyzing...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
