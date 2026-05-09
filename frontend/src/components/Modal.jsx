import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ onClose, children, width = 420, fullscreen = false }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isMobile = window.innerWidth <= 768;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: isMobile || fullscreen ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile || fullscreen ? 0 : '1rem',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: isMobile || fullscreen ? '100%' : width,
        maxHeight: isMobile || fullscreen ? '95vh' : '90vh',
        background: '#fff',
        borderRadius: isMobile || fullscreen ? '20px 20px 0 0' : '24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        animation: isMobile || fullscreen ? 'slideUp .3s ease both' : 'modalIn .25s ease both',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Handle para mobile */}
        {(isMobile || fullscreen) && (
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'#e0e0ff' }} />
          </div>
        )}
        {children}
      </div>

      <style>{`
        @keyframes modalIn  { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>,
    document.body
  );
}