import { ImageResponse } from 'next/og';

export const alt = 'ReClaim — Smart lost and found for Sri Lanka';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F2239 0%, #1E63A7 62%, #159B62 100%)', color: 'white',
      fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: 999, background: 'rgba(255,255,255,.07)', right: -120, top: -180 }} />
      <div style={{ display: 'flex', flexDirection: 'column', width: 980 }}>
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, marginBottom: 44, alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 64, height: 64, marginRight: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', color: '#1E63A7', fontSize: 36, fontWeight: 900 }}>
            R
          </div>
          ReClaim
        </div>
        <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.05, fontWeight: 800, maxWidth: 900 }}>
          Find what matters. Return what’s lost.
        </div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: 32, color: '#DCECF8' }}>
          Smart, secure lost &amp; found for communities across Sri Lanka
        </div>
      </div>
    </div>,
    size,
  );
}
