// Sistema de íconos: trazo 1.8px, grilla 24px, sin relleno — reemplaza los emojis.
// El color se hereda del texto (currentColor) salvo que se pase color= explícito.

const PATHS = {
  package:      <><path d="M3 8L12 3L21 8V17L12 22L3 17V8Z" /><path d="M3 8L12 13L21 8" /><path d="M12 13V22" /></>,
  scooter:      <><circle cx="5.5" cy="18.5" r="2.2" /><circle cx="18.5" cy="18.5" r="2.2" /><path d="M7.5 18.5H12L15 10H18" /><path d="M12 18.5L9.5 12H6.5" /><path d="M15 10L17 6" /></>,
  home:         <><path d="M4 11L12 4L20 11" /><path d="M6 10V20H18V10" /><path d="M10 20V15H14V20" /></>,
  mapPin:       <><path d="M12 21C12 21 18 14.5 18 10A6 6 0 0 0 6 10C6 14.5 12 21 12 21Z" /><circle cx="12" cy="10" r="2.2" /></>,
  user:         <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20C5.5 15.5 8.4 13.5 12 13.5C15.6 13.5 18.5 15.5 19.5 20" /></>,
  users:        <><circle cx="9" cy="8" r="3.2" /><path d="M3 20C3.8 16 6.1 14.2 9 14.2C11.9 14.2 14.2 16 15 20" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15.5 14.5C18.5 14.8 20 16.4 20.7 20" /></>,
  bolt:         <path d="M13 3L5 13H11L10 21L19 10H13L13 3Z" />,
  map:          <><path d="M9 4L3 6V19L9 17L15 19L21 17V4L15 6L9 4Z" /><path d="M9 4V17" /><path d="M15 6V19" /></>,
  send:         <><path d="M21 3L11 13" /><path d="M21 3L14.5 21L11 13L3 9.5L21 3Z" /></>,
  checkCircle:  <><circle cx="12" cy="12" r="9" /><path d="M8 12.5L11 15.5L16 9" /></>,
  bell:         <><path d="M6 10A6 6 0 0 1 18 10C18 14 19.5 15.5 19.5 15.5H4.5C4.5 15.5 6 14 6 10Z" /><path d="M10 19A2 2 0 0 0 14 19" /></>,
  messageCircle:<path d="M4 12A8 8 0 1 1 8.5 19L4 20L5.2 16C4.4 14.8 4 13.4 4 12Z" />,
  flame:        <path d="M12 3C12 3 7 8 7 13A5 5 0 0 0 17 13C17 10.5 15 9 14.5 7C14.3 9 13 9.5 13 9.5C13.5 6 12 3 12 3Z" />,
  trophy:       <><path d="M7 4H17V9A5 5 0 0 1 7 9V4Z" /><path d="M7 5H4V7A3 3 0 0 0 7 10" /><path d="M17 5H20V7A3 3 0 0 1 17 10" /><path d="M12 14V17" /><path d="M9 20H15" /><path d="M9 20L9.5 17H14.5L15 20" /></>,
  star:         <polygon points="12,3 14.6,9.2 21.3,9.5 16.1,13.6 18,20.1 12,16.3 6,20.1 7.9,13.6 2.7,9.5 9.4,9.2" />,
  barChart:     <><path d="M4 20V13" /><path d="M11 20V6" /><path d="M18 20V10" /><path d="M2 20H22" /></>,
  search:       <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20L15.3 15.3" /></>,
  list:         <><path d="M9 6H21" /><path d="M9 12H21" /><path d="M9 18H21" /><path d="M4 6H4.01" /><path d="M4 12H4.01" /><path d="M4 18H4.01" /></>,
  bag:          <><path d="M6 8H18L19 21H5L6 8Z" /><path d="M9 8V6A3 3 0 0 1 15 6V8" /></>,
  palette:      <><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" /><path d="M9 15A3 3 0 0 0 15 15C15 14 16.5 14 17.5 13C18.5 12 18 9 15.5 7.5" /></>,
  building:     <><path d="M5 21V4H15V21" /><path d="M15 21V9H19V21" /><path d="M3 21H21" /><path d="M8 7H8.01" /><path d="M12 7H12.01" /><path d="M8 11H8.01" /><path d="M12 11H12.01" /><path d="M8 15H8.01" /><path d="M12 15H12.01" /></>,
  crown:        <><path d="M4 18L2.5 8L8 12L12 5L16 12L21.5 8L20 18H4Z" /><path d="M4 18H20" /></>,
  logOut:       <><path d="M15 4H8A2 2 0 0 0 6 6V18A2 2 0 0 0 8 20H15" /><path d="M11 12H21" /><path d="M18 8.5L21.5 12L18 15.5" /></>,
  x:            <><path d="M5 5L19 19" /><path d="M19 5L5 19" /></>,
  chevronRight: <path d="M9 5L16 12L9 19" />,
  chevronLeft:  <path d="M15 5L8 12L15 19" />,
  eye:          <><path d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></>,
  eyeOff:       <><path d="M3 3L21 21" /><path d="M10.6 5.6C11 5.5 11.5 5.5 12 5.5C18.5 5.5 22 12 22 12C21.6 12.7 20.7 14 19.3 15.3M6.6 6.7C4 8.3 2 12 2 12C2 12 5.5 18.5 12 18.5C13.6 18.5 15 18.1 16.2 17.5" /><path d="M9.9 10A2.6 2.6 0 0 0 14 12.6" /></>,
  mail:         <><path d="M3 5H21V19H3V5Z" /><path d="M3 6L12 13L21 6" /></>,
  phone:        <path d="M6.5 3H9L10.5 7.5L8.3 9.2A13 13 0 0 0 14.8 15.7L16.5 13.5L21 15V17.5A2.5 2.5 0 0 1 18.5 20C11 20 4 13 4 5.5A2.5 2.5 0 0 1 6.5 3Z" />,
  lock:         <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7A4 4 0 0 1 16 7V11" /></>,
  plus:         <path d="M12 5V19M5 12H19" />,
  pencil:       <><path d="M4 20L4.6 16.7L15.5 5.8A1.7 1.7 0 0 1 18 5.8L18.2 6A1.7 1.7 0 0 1 18.2 8.5L7.3 19.4L4 20Z" /><path d="M14 7.5L16.5 10" /></>,
  rocket:       <><path d="M12 3C15 4 17 8 16.5 13L19 15.5L15.5 15A9 9 0 0 1 7.5 21L8 17.5L4.5 19L7 15.5C7 12 9.5 6.5 12 3Z" /><circle cx="13" cy="9" r="1.4" fill="currentColor" stroke="none" /></>,
  sparkles:     <><path d="M12 3L13.2 8.8L19 10L13.2 11.2L12 17L10.8 11.2L5 10L10.8 8.8L12 3Z" /><path d="M19 15L19.6 17.4L22 18L19.6 18.6L19 21L18.4 18.6L16 18L18.4 17.4L19 15Z" /></>,
  gauge:        <><path d="M4 15A8 8 0 1 1 20 15" /><path d="M12 15L16 10" /><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" /></>,
  refresh:      <><path d="M20 12A8 8 0 1 1 17.5 6.2" /><path d="M20 4V9H15" /></>,
  clock:        <><circle cx="12" cy="12" r="9" /><path d="M12 7V12L15.5 14.5" /></>,
  filter:       <path d="M4 5H20L14 12.5V19L10 17V12.5L4 5Z" />,
  arrowLeft:    <path d="M19 12H5M5 12L11 6M5 12L11 18" />,
  arrowRight:   <path d="M5 12H19M19 12L13 6M19 12L13 18" />,
  truck:        <><rect x="1.5" y="7" width="12.5" height="9" rx="1" /><path d="M14 10.5H18L21.5 14V16H14V10.5Z" /><circle cx="6" cy="18.5" r="1.6" /><circle cx="17.5" cy="18.5" r="1.6" /></>,
  image:        <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M3 16L8.5 11L13 15L16 12.5L21 17" /></>,
};

export default function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}
    >
      {body}
    </svg>
  );
}
