'use client';
import dynamic from 'next/dynamic';

// ─── MapView ──────────────────────────────────────────────────────────────────
const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => (
  <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">Loading map…</div>
) });

interface MapViewProps { lat: number; lng: number; label: string; }
export default function MapView({ lat, lng, label }: MapViewProps) {
  return <LeafletMap lat={lat} lng={lng} label={label} />;
}
