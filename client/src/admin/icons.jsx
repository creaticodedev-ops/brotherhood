const Icon = ({ size = 18, children, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </svg>
)

export const LockIcon = () => (
  <Icon size={20}>
    <rect x="3.5" y="8" width="11" height="7.5" rx="2" />
    <path d="M6 8V5.75a3 3 0 0 1 6 0V8" />
    <path d="M9 11v1.5" />
  </Icon>
)

export const OverviewIcon = () => (
  <Icon>
    <path d="M2.5 15.5h13" />
    <path d="M4.5 12.5v-3M8 12.5V5M11.5 12.5V8M15 12.5V3" />
  </Icon>
)

export const ApplicationsIcon = () => (
  <Icon>
    <rect x="3" y="2.5" width="12" height="13" rx="2" />
    <path d="M6 6.5h6M6 9.5h6M6 12.5h3.5" />
  </Icon>
)

export const SettingsIcon = () => (
  <Icon>
    <path d="M2.5 5.5h7M13.5 5.5h2M2.5 12.5h2M8.5 12.5h7" />
    <circle cx="11.5" cy="5.5" r="2" />
    <circle cx="6.5" cy="12.5" r="2" />
  </Icon>
)

export const BellIcon = () => (
  <Icon>
    <path d="M4.5 12.5V8a4.5 4.5 0 0 1 9 0v4.5l1.25 1.5H3.25z" />
    <path d="M7.5 15.75a1.6 1.6 0 0 0 3 0" />
  </Icon>
)

export const ExternalIcon = () => (
  <Icon size={16}>
    <path d="M10 3h5v5M15 3l-7 7" />
    <path d="M13 11v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1H7" />
  </Icon>
)

export const LogoutIcon = () => (
  <Icon size={16}>
    <path d="M7 15.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h3" />
    <path d="M11.5 12.5L15 9l-3.5-3.5M15 9H7" />
  </Icon>
)

export const SearchIcon = () => (
  <Icon size={16}>
    <circle cx="8" cy="8" r="5" />
    <path d="M15.5 15.5l-3.9-3.9" />
  </Icon>
)

export const CloseIcon = ({ size = 18 }) => (
  <Icon size={size}>
    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
  </Icon>
)

export const CheckIcon = ({ size = 16 }) => (
  <Icon size={size}>
    <path d="M3.5 9.5l3.5 3.5 7.5-8" />
  </Icon>
)

export const ChevronIcon = ({ className = 'adm-chevron' }) => (
  <Icon size={16} className={className}>
    <path d="M7 4l5 5-5 5" />
  </Icon>
)

export const SortIcon = ({ direction }) => (
  <svg className={`adm-sort is-${direction || 'none'}`} width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <path d="M5 1L8.5 4.5h-7z" className="adm-sort-up" fill="currentColor" />
    <path d="M5 11L1.5 7.5h7z" className="adm-sort-down" fill="currentColor" />
  </svg>
)

export const CopyIcon = () => (
  <Icon size={16}>
    <rect x="6" y="6" width="9.5" height="9.5" rx="1.75" />
    <path d="M12 6V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v6.5A1.5 1.5 0 0 0 4 12h2" />
  </Icon>
)

export const MailIcon = () => (
  <Icon size={16}>
    <rect x="2" y="3.5" width="14" height="11" rx="2" />
    <path d="M2.5 5l6.5 5 6.5-5" />
  </Icon>
)

export const WhatsAppIcon = ({ size = 16 }) => (
  <Icon size={size}>
    <path d="M3.1 15l.85-3.05A6.6 6.6 0 1 1 6.6 14.4z" />
    <path d="M6.7 6.1c.2-.4.6-.45.85-.2l.75 1.15c.15.25.1.55-.1.75l-.35.35c.35.85 1.1 1.6 1.95 1.95l.35-.35c.2-.2.5-.25.75-.1l1.15.75c.25.25.2.65-.2.85-.6.35-1.3.45-2 .15A5.6 5.6 0 0 1 6.55 8.1c-.3-.7-.2-1.4.15-2z" />
  </Icon>
)

export const MenuIcon = () => (
  <Icon>
    <path d="M3 6h12M3 12h12" />
  </Icon>
)
