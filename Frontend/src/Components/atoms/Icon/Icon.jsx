import { ICON_NAMES } from './icon-names';
import './Icon.css';

const BASE = import.meta.env.BASE_URL; // '/' by default; ends with '/'

/**
 * @param {object} props
 * @param {import('./icon-names').IconName} props.name
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'} [props.size]
 * @param {'success' | 'error' | 'info' | 'warning'} [props.gradient]
 * @param {string} [props.label]      Accessible name. Omit for decorative icons.
 * @param {string} [props.className]  Use for colour: `.danger { color: … }`
 */
export function Icon({ name, size = 'md', gradient, label, className = '' }) {
  if (import.meta.env.DEV && !ICON_NAMES.includes(name)) {
    console.warn(`[Icon] Unknown icon "${name}" — add public/icons/icon-${name}.svg and run "npm run icons".`);
  }

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const classes = `icon icon--${size} ${className}`.trim();

  if (gradient) {
    return (
      <span
        className={`${classes} icon--gradient icon--gradient-${gradient}`}
        style={{ '--icon-src': `url(${BASE}icons/icon-${name}.svg)` }}
        {...a11y}
      />
    );
  }

  return (
    <svg className={classes} {...a11y}>
      <use href={`${BASE}icons.svg#icon-${name}`} />
    </svg>
  );
}
