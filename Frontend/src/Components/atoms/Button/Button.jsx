import './Button.css';
import { typography } from '../../../shared-theme/themePrimitives';

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  style,
  ...props
}) {
  const classes = [
    'button-atom',
    `button-atom--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      type={type}
      style={{ fontFamily: typography.fontFamily, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}