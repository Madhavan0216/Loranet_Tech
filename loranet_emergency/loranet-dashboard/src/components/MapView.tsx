import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import { MapPin, WifiOff } from 'lucide-react';

const roleMarkerColors: Record<string, string> = {
  gateway: '#111111',
  relay: '#2D8A56',
  rescue: '#2563EB',
  victim: '#E85D3F',
};

interface MapViewProps {
  height?: string;
  showControls?: boolean;
}

export default function MapView({ height = '500px', showControls = true }: MapViewProps) {
  const { nodes, selectedNodeId, selectNode } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapRef.current, {
        center: [28.595, 83.935],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      // Add markers
      nodes.forEach(node => {
        const isVictimSOS = node.role === 'victim';
        const markerHtml = `
          <div style="
            width: ${isVictimSOS ? 32 : 26}px;
            height: ${isVictimSOS ? 32 : 26}px;
            border-radius: 50%;
            background: ${roleMarkerColors[node.role]};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
            ${isVictimSOS ? 'animation: sos-pulse 1.5s infinite;' : ''}
            cursor: pointer;
          ">
            ${node.role === 'gateway' ? '⬡' : node.role === 'relay' ? '◈' : node.role === 'rescue' ? '✚' : '!'}
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [isVictimSOS ? 32 : 26, isVictimSOS ? 32 : 26],
          iconAnchor: [isVictimSOS ? 16 : 13, isVictimSOS ? 16 : 13],
        });

        const marker = L.marker([node.lat, node.lng], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${node.name}</div>
            <div style="font-size: 12px; color: #777; margin-bottom: 8px;">${node.id} · ${node.role.toUpperCase()}</div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
              <div>🔋 Battery: <strong>${node.battery}%</strong></div>
              <div>📡 RSSI: <strong style="font-family: JetBrains Mono, monospace;">${node.rssi} dBm</strong></div>
              <div>📍 ${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</div>
              <div>⏱ Last seen: ${node.lastSeen}</div>
            </div>
          </div>
        `);

        marker.on('click', () => selectNode(node.id));
        markersRef.current.push(marker);
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Handle tile load error
      map.on('tileerror', () => setOffline(true));

    } catch {
      setOffline(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Pan to selected node
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      mapInstanceRef.current.setView([node.lat, node.lng], 14, { animate: true });
    }
  }, [selectedNodeId, nodes]);

  const fitBounds = () => {
    if (!mapInstanceRef.current) return;
    const bounds = nodes.map(n => [n.lat, n.lng] as [number, number]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  if (offline) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 bg-surface rounded-[14px]"
        style={{ height }}
      >
        <WifiOff className="w-10 h-10 text-border" />
        <div className="text-[14px] font-semibold text-txt-secondary">Map Unavailable</div>
        <div className="text-[12px] text-txt-secondary max-w-[220px] text-center">
          Map tiles require internet. Operating in offline mode with coordinate data only.
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-txt-secondary">
          {nodes.slice(0, 4).map(n => (
            <div key={n.id} className="px-2 py-1 bg-card rounded border border-border">
              {n.id}: {n.lat.toFixed(3)}, {n.lng.toFixed(3)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={mapRef} className="map-container" style={{ height: '100%' }} />
      {showControls && mapLoaded && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <button onClick={fitBounds} className="btn btn-sm bg-card shadow-card">
            <MapPin className="w-3.5 h-3.5" />
            Fit All Nodes
          </button>
        </div>
      )}
      {/* Legend */}
      {showControls && (
        <div className="absolute top-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-btn p-3 border border-border shadow-card">
          <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wide mb-2">Markers</div>
          {Object.entries(roleMarkerColors).map(([role, color]) => (
            <div key={role} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-[11px] text-txt capitalize">{role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
