'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LeafletMouseEvent, type Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

const markerIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

function MapEvents({ onChange }: Readonly<{ onChange: LeafletLocationPickerProps['onChange'] }>) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function Recenter({ lat, lng }: Readonly<{ lat: number | null; lng: number | null }>) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export default function LeafletLocationPicker({ lat, lng, onChange }: Readonly<LeafletLocationPickerProps>) {
  const position = useMemo<[number, number] | null>(
    () => lat !== null && lng !== null ? [lat, lng] : null,
    [lat, lng],
  );

  return (
    <MapContainer
      center={position ?? SRI_LANKA_CENTER}
      zoom={position ? 14 : 7}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-2xl"
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onChange={onChange} />
      <Recenter lat={lat} lng={lng} />
      {position && (
        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const marker = event.target as LeafletMarker;
              const next = marker.getLatLng();
              onChange(Number(next.lat.toFixed(6)), Number(next.lng.toFixed(6)));
            },
          }}
        />
      )}
    </MapContainer>
  );
}
