'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps { lat: number; lng: number; label: string; interactive?: boolean; }

export default function LeafletMap({ lat, lng, label, interactive = false }: LeafletMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false}
      style={{ height: '200px', width: '100%' }}
      dragging={interactive} zoomControl={interactive}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup>{label}</Popup>
      </Marker>
      {/* Approximate area circle */}
      <Circle center={[lat, lng]} radius={200} pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.1, weight: 2 }} />
    </MapContainer>
  );
}
