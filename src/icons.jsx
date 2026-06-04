// A small hand-rolled icon set (Phosphor-ish, stroke = currentColor) so we
// don't pull in a dependency or use emoji.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
}

const Svg = ({ size, children, ...rest }) => (
  <svg {...base} width={size || base.width} height={size || base.height} {...rest} aria-hidden="true">
    {children}
  </svg>
)

export const IconFridge = (p) => (
  <Svg {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
    <path d="M6 9h12" />
    <path d="M15 5.4v2.2M15 11.6v3.4" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconCamera = (p) => (
  <Svg {...p}>
    <path d="M3 8.5A2 2 0 0 1 5 6.5h1.6l1-1.6a1 1 0 0 1 .85-.48h7.1a1 1 0 0 1 .85.48l1 1.6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.4" />
  </Svg>
)

export const IconChat = (p) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4z" />
    <path d="M8.5 9h7M8.5 12h4" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9 6.5V4.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.7M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const IconEdit = (p) => (
  <Svg {...p}>
    <path d="M14.5 5.5l4 4M4 20l1-4L16 5a1.5 1.5 0 0 1 2 0l1 1a1.5 1.5 0 0 1 0 2L8 19z" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Svg>
)

export const IconSend = (p) => (
  <Svg {...p}>
    <path d="M5 12l15-7-6 15-3-6-6-2z" />
  </Svg>
)

export const IconLeaf = (p) => (
  <Svg {...p}>
    <path d="M20 4S8 4 6 12c-1 4 1.5 6.5 5.5 5.5C19.5 15.5 20 4 20 4z" />
    <path d="M11 13c2-3 5-5 8-6.5" />
  </Svg>
)

export const IconWarning = (p) => (
  <Svg {...p}>
    <path d="M12 4l9 15.5H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
)

export const IconCart = (p) => (
  <Svg {...p}>
    <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.47-1.18L20.5 7.5H6" />
    <circle cx="9.5" cy="20" r="1.3" />
    <circle cx="17.5" cy="20" r="1.3" />
  </Svg>
)

export const IconReceipt = (p) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" />
    <path d="M9 8h6M9 11.5h6M9 15h4" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />
  </Svg>
)

export const IconPin = (p) => (
  <Svg {...p}>
    <path d="M12 21v-7" />
    <path d="M8.5 3.5h7l-1 5.2 2.5 2.4a1 1 0 0 1-.7 1.7H6.7a1 1 0 0 1-.7-1.7l2.5-2.4z" />
  </Svg>
)

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" />
  </Svg>
)

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const IconCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
  </Svg>
)

export const IconBread = (p) => (
  <Svg {...p}>
    <path d="M4.5 12.5c0-2.8 3.3-4.5 7.5-4.5s7.5 1.7 7.5 4.5v.4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z" />
    <path d="M9 11.2l.7-1.5M12 11.2l.7-1.5M15 11.2l.7-1.5" />
  </Svg>
)

export const IconSnack = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 9.5h.01M14.6 10h.01M15 14.6h.01M9.6 14.8h.01M12 12.2h.01" />
  </Svg>
)

export const IconSpray = (p) => (
  <Svg {...p}>
    <path d="M8.5 9.5h5v10.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z" />
    <path d="M8.5 9.5V6.5h3" />
    <path d="M11.5 6.5l4-2.2v4.4z" />
    <path d="M17 4.6h2.2M17 7h2.2M19 5.8h1.6" />
  </Svg>
)

export const IconBookmark = (p) => (
  <Svg {...p}>
    <path d="M6 4.5h12v16l-6-4-6 4z" />
  </Svg>
)

// --- category glyphs (simple line icons) ---
export const IconMilk = (p) => (
  <Svg {...p}>
    <path d="M7 22V9l2-5h6l2 5v13z" />
    <path d="M7 9h10" />
    <path d="M10.5 4.2h3" />
  </Svg>
)

export const IconFish = (p) => (
  <Svg {...p}>
    <path d="M4 12c3-5 10-5 13 0-3 5-10 5-13 0z" />
    <path d="M17 12l3-2.5v5z" />
    <path d="M8 11h.01" />
  </Svg>
)

export const IconBowl = (p) => (
  <Svg {...p}>
    <path d="M4 11h16" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M10 4.5c-.4.8.4 1.2 0 2.4M14 4.5c.4.8-.4 1.2 0 2.4" />
  </Svg>
)

export const IconBottle = (p) => (
  <Svg {...p}>
    <path d="M10.5 3h3v3" />
    <path d="M9.5 6h5v14a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z" />
    <path d="M9.5 13h5" />
  </Svg>
)

export const IconCup = (p) => (
  <Svg {...p}>
    <path d="M7 4h10l-1.2 15a1 1 0 0 1-1 .9H9.2a1 1 0 0 1-1-.9z" />
    <path d="M8 9h8" />
  </Svg>
)

export const IconBox = (p) => (
  <Svg {...p}>
    <path d="M12 3l8 4v8l-8 4-8-4V7z" />
    <path d="M4 7l8 4 8-4" />
    <path d="M12 11v9" />
  </Svg>
)
