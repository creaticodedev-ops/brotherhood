/** Monoline illustrations for the four service pillars (white lines, one emerald accent). */
const glyphs = {
  gold: (
    <>
      <line x1="22" y1="18" x2="22" y2="70" />
      <rect x="16" y="30" width="12" height="26" rx="1.5" />
      <line x1="48" y1="24" x2="48" y2="76" />
      <rect x="42" y="40" width="12" height="22" rx="1.5" />
      <line x1="74" y1="10" x2="74" y2="58" />
      <rect x="68" y="20" width="12" height="26" rx="1.5" />
      <line className="is-accent" x1="100" y1="4" x2="100" y2="50" />
      <rect className="is-accent is-fill" x="94" y="10" width="12" height="28" rx="1.5" />
    </>
  ),
  invest: (
    <>
      <path d="M14 66 L60 80 L106 66 L60 52 Z" />
      <path d="M14 50 L60 64 L106 50 L60 36 Z" />
      <path className="is-accent" d="M14 34 L60 48 L106 34 L60 20 Z" />
    </>
  ),
  education: (
    <>
      <path d="M12 70 C36 70 40 46 60 46 C80 46 84 22 108 22" strokeDasharray="3 5" />
      <circle cx="12" cy="70" r="5" />
      <circle cx="60" cy="46" r="5" />
      <circle className="is-accent is-fill" cx="108" cy="22" r="6" />
    </>
  ),
  analysis: (
    <>
      <path d="M8 64 L30 52 L48 58 L70 34 L90 40 L112 18" />
      <circle className="is-accent" cx="70" cy="34" r="15" />
      <line className="is-accent" x1="81" y1="45" x2="94" y2="58" />
      <line x1="8" y1="78" x2="112" y2="78" strokeDasharray="2 6" />
    </>
  ),
}

export const ServiceGlyph = ({ name }) => (
  <svg className="glyph" viewBox="0 0 120 86" aria-hidden="true">
    {glyphs[name]}
  </svg>
)

export default ServiceGlyph
