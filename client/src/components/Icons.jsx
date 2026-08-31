// Minimal inline stroke icons (Lucide-style) — no icon dependency.
const S = ({ children, size = 16, ...p }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {children}
  </svg>
);

export const IconShield = (p) => (
  <S {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6l7-3z" />
  </S>
);
export const IconGrid = (p) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </S>
);
export const IconQueue = (p) => (
  <S {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3.5" cy="6" r="1.2" />
    <circle cx="3.5" cy="12" r="1.2" />
    <circle cx="3.5" cy="18" r="1.2" />
  </S>
);
export const IconLog = (p) => (
  <S {...p}>
    <path d="M4 4h16v16H4z" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </S>
);
export const IconRules = (p) => (
  <S {...p}>
    <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
    <circle cx="12" cy="12" r="3" />
  </S>
);
export const IconSettings = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.22.65.22 1z" />
  </S>
);
export const IconPlay = (p) => (
  <S {...p}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </S>
);
export const IconRefresh = (p) => (
  <S {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </S>
);
export const IconArrowRight = (p) => (
  <S {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </S>
);
export const IconDownload = (p) => (
  <S {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </S>
);
export const IconClose = (p) => (
  <S {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </S>
);
export const IconCheck = (p) => (
  <S {...p}>
    <polyline points="20 6 9 17 4 12" />
  </S>
);
export const IconBolt = (p) => (
  <S {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </S>
);
export const IconStop = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </S>
);
export const IconSearch = (p) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </S>
);
export const IconChevron = (p) => (
  <S {...p}>
    <polyline points="6 9 12 15 18 9" />
  </S>
);
export const IconWarn = (p) => (
  <S {...p}>
    <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="17" />
  </S>
);
export const IconRobot = (p) => (
  <S {...p}>
    <rect x="4" y="7" width="16" height="12" rx="3" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <circle cx="9" cy="13" r="1" />
    <circle cx="15" cy="13" r="1" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
  </S>
);
export const IconFlow = (p) => (
  <S {...p}>
    <rect x="3" y="3" width="6" height="6" rx="1.5" />
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <rect x="15" y="3" width="6" height="6" rx="1.5" />
    <path d="M9 6h3a3 3 0 0 1 3 3M6 9v3a3 3 0 0 0 3 3h3" />
  </S>
);
export const IconCheckCircle = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="8.5 12 11 14.5 16 9" />
  </S>
);
export const IconPhone = (p) => (
  <S {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
  </S>
);
export const IconMic = (p) => (
  <S {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <line x1="12" y1="18" x2="12" y2="22" />
  </S>
);
export const IconReceipt = (p) => (
  <S {...p}>
    <path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </S>
);
export const IconChart = (p) => (
  <S {...p}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="11" width="3" height="6" />
    <rect x="11" y="7" width="3" height="10" />
    <rect x="16" y="13" width="3" height="4" />
  </S>
);
export const IconPlug = (p) => (
  <S {...p}>
    <path d="M9 2v6M15 2v6" />
    <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
    <line x1="12" y1="16" x2="12" y2="22" />
  </S>
);
export const IconInbox = (p) => (
  <S {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
  </S>
);
export const IconActivity = (p) => (
  <S {...p}>
    <polyline points="3 12 6 12 9 4 15 20 18 12 21 12" />
  </S>
);
export const IconCalendar = (p) => (
  <S {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="8" y1="2.5" x2="8" y2="6" />
    <line x1="16" y1="2.5" x2="16" y2="6" />
  </S>
);
export const IconMinus = (p) => (
  <S {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </S>
);
export const IconPlus = (p) => (
  <S {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </S>
);
