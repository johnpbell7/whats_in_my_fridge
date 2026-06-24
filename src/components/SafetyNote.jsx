import { IconWarning } from '../icons.jsx'

// A small, persistent safety disclaimer shown alongside AI cooking output
// (recipes, meal ideas). Contextual reminders like this hold up far better than
// ones buried only in the Terms — see /terms.html for the full version.
export default function SafetyNote({ style }) {
  return (
    <p className="safety-note" style={style}>
      <IconWarning size={12} className="inline-ico" />
      AI can make mistakes — cook food to safe temperatures, follow use-by dates, and check labels for
      allergens yourself.
    </p>
  )
}
