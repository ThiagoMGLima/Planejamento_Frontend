/**
 * Ícones SVG da UI — traço 2px, 24×24, `currentColor` (estilo Lucide/Feather).
 * Substituem os emojis/glifos unicode do chrome, que renderizavam diferente em
 * cada sistema. Zero dependência: só os paths que o app realmente usa.
 *
 * Uso: <IconCheck size={14} /> — herda a cor do texto do botão/elemento pai.
 */

function Icon({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Logo da marca: calendário com check (o mesmo da Topbar/favicon/boot). */
export const IconLogo = (p) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18" />
    <path d="M8 3v3M16 3v3" />
    <path d="M8.5 14.2l2.1 2.1 4.7-4.8" />
  </Icon>
)

export const IconChevronLeft = (p) => (
  <Icon {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
)

export const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="M9 18l6-6-6-6" />
  </Icon>
)

export const IconSun = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Icon>
)

export const IconMoon = (p) => (
  <Icon {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
)

export const IconCheck = (p) => (
  <Icon {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
)

export const IconRotate = (p) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Icon>
)

export const IconSparkles = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" />
  </Icon>
)

export const IconAlert = (p) => (
  <Icon {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
)

export const IconX = (p) => (
  <Icon {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
)

export const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const IconMessage = (p) => (
  <Icon {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
)

/** Lápis — modo Editar (arrastar/reorganizar). */
export const IconPencil = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Icon>
)
