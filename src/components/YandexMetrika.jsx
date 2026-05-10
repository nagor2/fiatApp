import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const YM_ID = 109135041;

export default function YandexMetrika() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    // Skip first render — init snippet already sent the initial hit.
    if (isFirst.current) { isFirst.current = false; return; }
    if (typeof window.ym !== 'function') return;
    window.ym(YM_ID, 'hit', window.location.href, {
      title: document.title,
      referer: document.referrer,
    });
  }, [location.pathname, location.search]);

  return null;
}
