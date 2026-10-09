import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Navigation, Info } from 'lucide-react';

export default function MapView({ milestones = [], activeTrip = null, pendingRides = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [routingProvider, setRoutingProvider] = useState('OSRM');

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([18.85, 73.3], 9);

      // CartoDB Dark Matter tile layer for the dark city aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(mapRef.current);

      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Layers when milestones, activeTrip, or pendingRides change
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current || !milestones.length) return;

    const layer = layerGroupRef.current;
    layer.clearLayers();

    const mainline = milestones.filter(m => m.is_mainline).sort((a, b) => a.km - b.km);
    const byName = Object.fromEntries(milestones.map(m => [m.name, m]));

    // 1. Draw highway mainline in sleek slate
    const mainlineCoords = mainline.map(m => [m.lat, m.lng]);
    L.polyline(mainlineCoords, {
      color: '#334155',
      weight: 4,
      opacity: 0.85,
      dashArray: '3, 6'
    }).addTo(layer);

    // 2. Draw milestones markers
    milestones.forEach(m => {
      const isDetour = !m.is_mainline;
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: isDetour ? 5 : 4,
        color: isDetour ? '#f59e0b' : '#64748b',
        fillColor: isDetour ? '#b45309' : '#1e293b',
        fillOpacity: 1,
        weight: 2
      });

      marker.bindTooltip(`<b>${m.name}</b> (${m.km} km)${isDetour ? ' [Detour Node]' : ''}`, {
        direction: 'top',
        className: 'custom-tooltip'
      });
      marker.addTo(layer);
    });

    // 3. Draw active pooled trip route & stops
    if (activeTrip && activeTrip.stops && activeTrip.stops.length > 0) {
      const stops = activeTrip.stops;
      setRoutingProvider(activeTrip.routing_provider || 'OSRM');

      // Draw polyline route (from OSRM geometry or stop connections)
      let routePoints = activeTrip.route_geometry;
      if (!routePoints || routePoints.length === 0) {
        routePoints = stops
          .map(s => {
            const node = byName[s.location] || milestones.find(m => m.km === s.km_coordinate);
            return node ? [node.lat, node.lng] : [s.lat, s.lng];
          })
          .filter(Boolean);
      }

      if (routePoints.length >= 2) {
        // Glowing cyan base route polyline
        L.polyline(routePoints, {
          color: activeTrip.routing_provider === 'OSRM' ? '#00e5ff' : '#f59e0b',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(layer);

        // Highlight vehicle location if at stop
        const currentStop = stops.find(s => s.status !== 'COMPLETED') || stops[stops.length - 1];
        if (currentStop) {
          const carIcon = L.divIcon({
            className: 'custom-map-icon',
            html: `<div class="pulse-marker car" title="${activeTrip.driver_name || 'FairPool Cab'}">🚖</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          L.marker([currentStop.lat, currentStop.lng], { icon: carIcon }).addTo(layer);
        }

        // Floating badges on map matching Reference Image 2:
        // [PICKUP 1 MIN | Options] and [DROPOFF 1:48 pm | Options]
        stops.forEach((s, idx) => {
          const isPickup = s.stop_type === 'PICKUP';
          const isDone = s.status === 'COMPLETED';

          const badgeHtml = isPickup
            ? `<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200 text-xs font-bold whitespace-nowrap animate-in fade-in">
                 <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase">PICKUP</span>
                 <span class="text-slate-800">1 MIN</span>
                 <span class="text-slate-300">|</span>
                 <span class="text-slate-500 font-semibold text-[11px]">Options</span>
               </div>`
            : `<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200 text-xs font-bold whitespace-nowrap animate-in fade-in">
                 <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">DROPOFF</span>
                 <span class="text-slate-800">1:48 pm</span>
                 <span class="text-slate-300">|</span>
                 <span class="text-slate-500 font-semibold text-[11px]">Options</span>
               </div>`;

          // Custom DivIcon for the Reference Image 2 floating badge
          const pillIcon = L.divIcon({
            className: 'custom-map-pill',
            html: badgeHtml,
            iconSize: [140, 36],
            iconAnchor: [70, 48]
          });

          L.marker([s.lat, s.lng], { icon: pillIcon }).addTo(layer);

          // Dot marker below pill
          const marker = L.circleMarker([s.lat, s.lng], {
            radius: 8,
            color: isDone ? '#64748b' : (isPickup ? '#3b82f6' : '#10b981'),
            fillColor: isDone ? '#1e293b' : (isPickup ? '#1d4ed8' : '#059669'),
            fillOpacity: 1,
            weight: 3
          });

          marker.bindTooltip(
            `<b>Stop ${idx + 1}: ${s.stop_type}</b><br/>${s.rider_id} @ ${s.location} (${s.km_coordinate} km)<br/>Status: ${s.status}`,
            { direction: 'top' }
          );
          marker.addTo(layer);
        });

        // Fit map bounds to trip
        mapRef.current.fitBounds(L.latLngBounds(routePoints), {
          padding: [80, 80],
          maxZoom: 12
        });
      }
    } else {
      // Default view: whole expressway
      if (mainlineCoords.length) {
        mapRef.current.fitBounds(L.latLngBounds(mainlineCoords), {
          padding: [60, 60]
        });
      }
    }
  }, [milestones, activeTrip, pendingRides]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="map-layer" />

      {/* Routing Source Badge overlay on top right */}
      <div className="absolute top-4 right-16 z-20 pointer-events-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold shadow-lg ${
          routingProvider === 'OSRM'
            ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400'
            : 'bg-slate-900/80 border-amber-500/40 text-amber-400'
        }`}>
          {routingProvider === 'OSRM' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>⚡ Live OSRM Road Geometry</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>⚠️ Simulated Haversine Route</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
