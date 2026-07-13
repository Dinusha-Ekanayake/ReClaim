'use client';

import dynamic from 'next/dynamic';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const LeafletLocationPicker = dynamic(() => import('./LeafletLocationPicker'), {
  ssr: false,
  loading: () => <div className="skeleton h-64 w-full rounded-2xl" aria-label="Loading location map" />,
});

export default function LocationPicker(props: Readonly<LocationPickerProps>) {
  return <LeafletLocationPicker {...props} />;
}
