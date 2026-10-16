// Loaded on demand by the phone field so the flags stay out of the form chunk.
const modules = import.meta.glob('/node_modules/country-flag-icons/string/3x2/[A-Z][A-Z].js', { eager: true, import: 'default' })

export const FLAGS = Object.fromEntries(
  Object.entries(modules).map(([path, svg]) => [path.slice(-5, -3), `data:image/svg+xml,${encodeURIComponent(svg)}`]),
)
