import { ICON_NAMES } from './icon-names';
import './Icon.css';

const BASE = import.meta.env.BASE_URL; // '/' by default; ends with '/'

/**
 * @param {object} props
 * @param {import('./icon-names').IconName} props.variant
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'} [props.size]
 * @param {'primary' | 'inverted' | 'disabled'} [props.gradient]
 * @param {string} [props.label]      Accessible name. Omit for decorative icons.
 * @param {string} [props.className]  Use for colour: `.danger { color: … }`
 */
export function Icon({ variant, size = 'md', gradient = 'success', label, className = '' }) {
  if (import.meta.env.DEV && !ICON_NAMES.includes(variant)) {
    console.warn(`[Icon] Unknown icon "${variant}" — add public/icons/icon-${variant}.svg and run "npm run icons".`);
  }

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const classes = `icon icon--${size} ${className}`.trim();

  if (gradient) {
    return (
      <span
        className={`${classes} icon--gradient icon--gradient-${gradient}`}
        style={{ '--icon-src': `url(${BASE}icons/icon-${variant}.svg)` }}
        {...a11y}
      />
    );
  }

  return (
    <svg className={classes} {...a11y}>
      <use href={`${BASE}icons.svg#icon-${variant}`} />
    </svg>
  );
}
