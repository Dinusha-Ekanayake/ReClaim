import { ImageResponse } from 'next/og';

export const alt = 'ReClaim — Smart lost and found for Sri Lanka';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f2d6b 0%, #2563eb 58%, #10b981 100%)', color: 'white',
      fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: 999, background: 'rgba(255,255,255,.08)', right: -120, top: -180 }} />
      <div style={{ display: 'flex', flexDirection: 'column', width: 980 }}>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, marginBottom: 48, alignItems: 'center' }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: 'white', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 18 }}>R</div>
          ReClaim
        </div>
        <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.05, fontWeight: 800, maxWidth: 900 }}>
          Find what matters. Return what’s lost.
        </div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: 32, color: '#dbeafe' }}>
          Smart, secure lost &amp; found for communities across Sri Lanka
        </div>
      </div>
    </div>,
    size,
  );
}
