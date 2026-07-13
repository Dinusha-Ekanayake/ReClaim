'use client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
const icon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LeafletMapProps { lat: number; lng: number; label: string; interactive?: boolean; precise?: boolean; }

export default function LeafletMap({ lat, lng, label, interactive = false, precise = false }: LeafletMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={precise ? 15 : 13} scrollWheelZoom={false}
      style={{ height: '200px', width: '100%' }}
      dragging={interactive} zoomControl={interactive}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {precise && (
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>{label}</Popup>
        </Marker>
      )}
      <Circle
        center={[lat, lng]}
        radius={precise ? 200 : 800}
        pathOptions={{ color: '#1E63A7', fillColor: '#1E63A7', fillOpacity: 0.1, weight: 2 }}
      />
    </MapContainer>
  );
}
