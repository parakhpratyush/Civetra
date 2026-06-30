import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet.heat";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Issue, ISSUE_CATEGORIES } from "../types";
import { Navigation, Loader2, Layers, AlertTriangle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

function MapUpdater({ center, issues, shouldFitBounds, onBoundsSet }: { center: { lat: number, lng: number }, issues?: Issue[], shouldFitBounds?: boolean, onBoundsSet?: () => void }) {
  const map = useMap();
  const prevCenter = useRef(center);

  useEffect(() => {
    if (shouldFitBounds && issues && issues.length > 0) {
      const validIssues = issues.filter(i => i.location && typeof i.location.lat === 'number' && typeof i.location.lng === 'number');
      if (validIssues.length > 0) {
        const bounds = L.latLngBounds(validIssues.map(i => [i.location.lat, i.location.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        if (onBoundsSet) onBoundsSet();
      }
    }
  }, [shouldFitBounds, issues, map]); // Removed onBoundsSet from deps to prevent unnecessary runs

  useEffect(() => {
    if (prevCenter.current.lat !== center.lat || prevCenter.current.lng !== center.lng) {
      map.setView([center.lat, center.lng], 15);
      prevCenter.current = center;
    }
  }, [center.lat, center.lng, map]);

  return null;
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const heat = (L as any).heatLayer(points, { radius: 60, blur: 40, maxZoom: 12, minOpacity: 0.4 }).addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  return null;
}

function ZoomLimiter({ mapType, onLimitReached }: { mapType: "basic" | "satellite", onLimitReached: () => void }) {
  const map = useMap();
  // TomTom satellite usually maxes at 19, basic at 22
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

import { useTheme } from '../ThemeContext';

export function MapPage() {
  const { isDark } = useTheme();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const passedState = routerLocation.state as { selectedIssueId?: string, location?: {lat: number, lng: number} } | null;

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState(passedState?.location || { lat: 37.7749, lng: -122.4194 });
  const [mapType, setMapType] = useState<"basic" | "satellite">("basic");
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [hasSetInitialBounds, setHasSetInitialBounds] = useState(false);
  const warningTimeoutRef = useRef<number | null>(null);

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
    ? (isDark 
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` 
        : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`)
    : `https://api.tomtom.com/map/1/tile/sat/main/{z}/{x}/{y}.jpg?key=${apiKey}`;

  useEffect(() => {
    if (passedState?.location) {
      setMapCenter(passedState.location);
    }
  }, [passedState?.location]);

  useEffect(() => {
    if (passedState?.selectedIssueId && issues.length > 0) {
      const issue = issues.find(i => i.id === passedState.selectedIssueId);
      if (issue) {
        setSelectedIssue(issue);
      }
    }
  }, [passedState?.selectedIssueId, issues]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "issues"), (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });
      setIssues(fetchedIssues);
    });
    return () => unsubscribe();
  }, []);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
        setIsLocating(false);
      },
      async (error) => {
        // Fallback to IP-based location if Geolocation API fails/is denied
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            const newLocation = { lat: data.latitude, lng: data.longitude };
            setUserLocation(newLocation);
            setMapCenter(newLocation);
          } else {
            alert("Could not determine location. Please ensure location services are enabled.");
          }
        } catch (e) {
          alert("Could not determine location. Please ensure location services are enabled.");
        }
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const createCustomIcon = (issue: Issue) => {
    let bgColor = "#ef4444"; 
    let borderColor = "#b91c1c";
    let animationClass = "marker-hard-blink-fast";
    let shadowStyle = "";

    const status = issue.status || 'pending';

    if (status === "pending") {
      bgColor = "#ef4444"; // red
      borderColor = "#b91c1c";
      animationClass = "marker-hard-blink-fast";
    } else if (status === "verified") {
      bgColor = "#f97316"; // orange
      borderColor = "#c2410c";
      animationClass = "marker-hard-blink-med";
    } else if (status === "in_progress") {
      bgColor = "#eab308"; // yellow
      borderColor = "#a16207";
      animationClass = "marker-hard-blink-slow";
    } else if (status === "resolved") {
      bgColor = "#14532d"; // dark green
      borderColor = "#064e3b";
      animationClass = ""; // no blinking
      shadowStyle = "box-shadow: 0 0 25px 8px rgba(74,222,128,0.7);"; // aura of light green
    } else if (status === "revoked") {
      bgColor = "#000000"; // black
      borderColor = "#ef4444";
      animationClass = "";
    }

    const categoryData = ISSUE_CATEGORIES.find(c => c.id === issue.category);
    const imageUrl = issue.imageUrl || categoryData?.imageUrl || "/assets/categories/infrastructure.png";

    const htmlString = `
      <div 
        class="${animationClass}"
        style="
          background-color: ${bgColor}; 
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid ${borderColor};
          ${shadowStyle}
        "
        title="${issue.title}"
      ></div>
    `;

    return L.divIcon({
      html: htmlString,
      className: "custom-leaflet-icon bg-transparent",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  const createClusterCustomIcon = function (cluster: any) {
    return L.divIcon({
      html: `<div style="background-color: #3b82f6; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 0 20px 5px rgba(59,130,246,0.5); font-size: 12px; font-weight: bold; color: white;"><span>${cluster.getChildCount()}</span></div>`,
      className: 'custom-leaflet-cluster-icon bg-transparent',
      iconSize: L.point(36, 36, true),
    });
  };

  const userIcon = L.divIcon({
    html: `<div style="width: 14px; height: 14px; background-color: #ffffff; border-radius: 50%; box-shadow: 0 0 15px 5px rgba(255,255,255,0.6);"></div>`,
    className: "custom-leaflet-user-icon bg-transparent",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  return (
    <div className="w-full h-full pt-20 md:pt-20 px-4 md:px-8 pb-32 max-w-[1600px] mx-auto">
      <style>{`
        @keyframes hard-blink {
          0% { opacity: 1; }
          49.9% { opacity: 1; }
          50% { opacity: 0.15; }
          99.9% { opacity: 0.15; }
          100% { opacity: 1; }
        }
        .marker-hard-blink-fast { animation: hard-blink 0.4s infinite; }
        .marker-hard-blink-med { animation: hard-blink 1s infinite; }
        .marker-hard-blink-slow { animation: hard-blink 2.5s infinite; }
      `}</style>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[60vh] md:h-[75vh] min-h-[400px] md:min-h-[600px] w-full rounded-2xl overflow-hidden border border-white/5 bg-black relative z-0 shadow-2xl">
        <MapContainer 
          center={[mapCenter.lat, mapCenter.lng]} 
          zoom={13} 
          style={{ height: "100%", width: "100%" }}
          className={`w-full h-full z-0 map-container-custom transition-all duration-1000 ${!isDark ? 'contrast-[0.85] saturate-[0.6] sepia-[0.1] brightness-[0.95]' : ''}`}
          zoomControl={true}
        >
        <MapUpdater 
          center={mapCenter} 
          issues={issues} 
          shouldFitBounds={!passedState?.location && !passedState?.selectedIssueId && !hasSetInitialBounds} 
          onBoundsSet={() => setHasSetInitialBounds(true)}
        />
        <ZoomLimiter mapType={mapType} onLimitReached={handleZoomLimitReached} />
        <TileLayer
          url={tileUrl}
          maxZoom={22}
          attribution='&copy; <a href="https://www.tomtom.com/">TomTom</a>'
        />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={50} />
        )}
        
        {!showHeatmap && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
          >
            {issues.map(issue => (
              <Marker 
                key={issue.id} 
                position={[issue.location.lat, issue.location.lng]}
                icon={createCustomIcon(issue)}
                eventHandlers={{
                  click: () => setSelectedIssue(issue),
                }}
              />
            ))}
          </MarkerClusterGroup>
        )}

        {showHeatmap && (
          <>
            <HeatmapLayer 
              points={issues.map(i => [
                i.location.lat, 
                i.location.lng, 
                i.severity === 'Critical' ? 1.0 : i.severity === 'High' ? 0.7 : i.severity === 'Medium' ? 0.4 : 0.2
              ])} 
            />
            {/* Invisible clickable layer on top of heatmap */}
            {issues.map(issue => (
              <CircleMarker
                key={`heat-click-${issue.id}`}
                center={[issue.location.lat, issue.location.lng]}
                radius={20}
                pathOptions={{ color: 'transparent', fillColor: 'transparent' }}
                eventHandlers={{
                  click: () => setSelectedIssue(issue),
                }}
              />
            ))}
          </>
        )}
      </MapContainer>

      <AnimatePresence>
        {showZoomWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2.5 rounded-full shadow-lg z-[500] flex items-center gap-2 pointer-events-none backdrop-blur-sm border border-slate-700"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">Maximum zoom level reached</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Controls - Pushed down to top-20 to avoid overlapping global Add Report button */}
      <div className="absolute top-20 right-4 flex flex-col gap-2 z-[400]">
        <button
          onClick={() => setMapType(prev => prev === "basic" ? "satellite" : "basic")}
          className={`flex items-center justify-center p-3 rounded-full shadow-lg transition-colors ${isDark ? 'bg-black text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-slate-100'}`}
          title={mapType === "basic" ? "Switch to Satellite" : "Switch to Basic"}
        >
          <Layers className="w-5 h-5" />
        </button>
        <div className="relative group/heat">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center justify-center p-3 rounded-full shadow-lg transition-all ${showHeatmap ? 'bg-gradient-to-br from-amber-500/20 to-red-500/20 text-red-500 border border-red-500/30 hover:from-amber-500/30 hover:to-red-500/30' : (isDark ? 'bg-black text-white hover:bg-slate-800 border border-transparent' : 'bg-white text-black hover:bg-slate-100 border border-transparent')}`}
            title="Toggle Thermal View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Z"/><path d="M17.5 17.5 15 15"/><path d="M6.5 6.5 9 9"/><path d="M17.5 6.5 15 9"/><path d="M6.5 17.5 9 15"/></svg>
          </button>
          
          <div
            className={`absolute right-14 top-1/2 -translate-y-1/2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-2xl border whitespace-nowrap pointer-events-none transition-all duration-300 opacity-0 translate-x-2 group-hover/heat:opacity-100 group-hover/heat:translate-x-0 ${isDark ? 'bg-[#030308]/90 border-white/20 text-white' : 'bg-white/90 border-black/10 text-black'}`}
          >
            Thermal View
          </div>
        </div>
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="bg-white dark:bg-slate-900 p-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-70 flex items-center justify-center"
          title="Locate Me"
        >
          {isLocating ? <Loader2 className="w-5 h-5 animate-spin dark:text-brand" /> : <Navigation className="w-5 h-5" />}
        </button>
      </div>
      
      {selectedIssue && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white/60 dark:bg-black/40 backdrop-blur-3xl p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/10 z-[400]">
          {selectedIssue.imageUrl && (
            <div className="w-full h-32 mb-3 rounded-xl overflow-hidden border border-black/5 dark:border-white/10">
              <img src={selectedIssue.imageUrl} alt={selectedIssue.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-slate-800 dark:text-white">{selectedIssue.title}</h3>
            <button onClick={() => setSelectedIssue(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">×</button>
          </div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Severity: {selectedIssue.severity}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{selectedIssue.description}</p>
          <button 
            onClick={() => navigate("/feed", { state: { expandedIssueId: selectedIssue.id } })}
            className="w-full py-2 bg-blue-600 dark:bg-brand text-white rounded-xl shadow-md shadow-blue-100 dark:shadow-brand/20 text-sm font-bold hover:bg-blue-700 dark:hover:bg-brand/90 transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    </motion.div>
    </div>
  );
}

