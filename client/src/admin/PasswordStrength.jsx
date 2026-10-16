import { CheckIcon } from './icons'
import { classesOf, MIN_PASSWORD, strengthOf } from './passwordRules'
import { useAdminText } from './strings'

export const Strength = ({ value }) => {
  const a = useAdminText()
  const score = strengthOf(value)
  return (
    <div className={`adm-strength is-${score}`} aria-live="polite">
      <span className="adm-strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= score ? 'is-on' : undefined} />
        ))}
      </span>
      <span>
        {a('reset.strength.label')} · <strong>{a(`reset.strength.${score}`)}</strong>
      </span>
    </div>
  )
}

const Rule = ({ ok, children }) => (
  <li className={ok ? 'is-ok' : undefined}>
    <CheckIcon size={14} />
    <span>{children}</span>
  </li>
)

export const PasswordRules = ({ id, password, confirm }) => {
  const a = useAdminText()
  return (
    <ul className="adm-rules" id={id}>
      <Rule ok={password.length >= MIN_PASSWORD}>{a('reset.rules.length')}</Rule>
      <Rule ok={classesOf(password) >= 3}>{a('reset.rules.mix')}</Rule>
      <Rule ok={Boolean(confirm) && confirm === password}>{a('reset.rules.match')}</Rule>
    </ul>
  )
}
