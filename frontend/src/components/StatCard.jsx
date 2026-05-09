import { useEffect, useRef } from 'react';

export default function StatCard({ icon, value, label, delay = 0 }) {
  const valRef = useRef(null);

  useEffect(() => {
    const el = valRef.current;
    if (!el) return;
    const isNum = !isNaN(value) && !String(value).includes('%');
    if (!isNum) { el.textContent = value; return; }
    const target = parseInt(value);
    let start = null;
    const duration = 900;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(e * target)).padStart(String(target).length, '0');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = value;
    };
    const timer = setTimeout(() => requestAnimationFrame(tick), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="stat-card slide-up" style={{ animationDelay: `${delay}ms` }}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value" ref={valRef}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}