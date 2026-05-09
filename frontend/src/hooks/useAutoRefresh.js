import { useEffect, useRef } from 'react';

/**
 * Hook que llama a fetchFn cada `interval` ms automáticamente
 * y también cuando la ventana recupera el foco.
 */
export function useAutoRefresh(fetchFn, interval = 15000) {
  const fnRef = useRef(fetchFn);
  useEffect(() => { fnRef.current = fetchFn; }, [fetchFn]);

  useEffect(() => {
    const tick = () => fnRef.current?.();
    const id = setInterval(tick, interval);
    const onFocus = () => fnRef.current?.();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [interval]);
}