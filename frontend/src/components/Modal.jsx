import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal centrado sobre el app-wrap (max-width 1080px)
 * Se renderiza via portal para salir del flujo del DOM
 * pero visualmente se posiciona solo sobre la app, no toda la pantalla
 */
export default function Modal({ onClose, children, width = 420 }) {
  const overlayRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(8,18,40,0.75)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Contenedor centrado limitado al ancho de la app */}
      <div style={{
        width: '100%',
        maxWidth: width,
        background: 'var(--bg-top)',
        border: '1px solid var(--border-md)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.2s ease both',
      }}>
        {children}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}