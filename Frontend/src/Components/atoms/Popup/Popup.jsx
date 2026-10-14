import './Popup.css';
import { componentStyles } from '../../../shared-theme/themePrimitives';

const VARIANTS = ['success', 'error'];

export default function Popup({
  title = 'Success !',
  message = 'logged in successfully',
  variant = 'success',
  onClose,
  className = '',
  style,
  ...props
}) {
  const tone = VARIANTS.includes(variant) ? variant : 'success';

  return (
    <div
      className={['popup', `popup--${tone}`, className].filter(Boolean).join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
      style={{ ...componentStyles.popup, ...style }}
      {...props}
    >
      <span className="popup__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          {tone === 'success' ? (
            <path d="m5 12.5 4.5 4.5L19.5 7" />
          ) : (
            <path d="m6 6 12 12M18 6 6 18" />
          )}
        </svg>
      </span>
      <span className="popup__copy">
        <span className="popup__title">{title}</span>
        <span className="popup__message">{message}</span>
      </span>
      <span className="popup__divider" aria-hidden="true" />
      <button className="popup__close" type="button" onClick={onClose} aria-label="Dismiss notification">
        {tone === 'success' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        )}
      </button>
    </div>
  );
}
