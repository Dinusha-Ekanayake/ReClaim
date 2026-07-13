'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const NODES = [
  ['8%', '18%', '0s'],
  ['21%', '72%', '1.8s'],
  ['39%', '28%', '0.7s'],
  ['56%', '82%', '2.5s'],
  ['73%', '19%', '1.2s'],
  ['91%', '62%', '3.1s'],
] as const;

export default function CommunityBackdrop() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const section = pathname.startsWith('/chat')
    ? 'chat'
    : pathname.startsWith('/items') || pathname.startsWith('/search')
      ? 'items'
      : pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
        ? 'workspace'
        : pathname.startsWith('/auth')
          ? 'auth'
          : 'community';

  return (
    <div className="community-backdrop" data-online={String(online)} data-section={section} aria-hidden="true">
      <div className="community-backdrop__mesh" />
      <div className="community-backdrop__glow community-backdrop__glow--blue" />
      <div className="community-backdrop__glow community-backdrop__glow--green" />
      <div className="community-backdrop__route" />
      {NODES.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className="community-backdrop__node"
          style={{ left, top, animationDelay: delay }}
        />
      ))}
    </div>
  );
}
