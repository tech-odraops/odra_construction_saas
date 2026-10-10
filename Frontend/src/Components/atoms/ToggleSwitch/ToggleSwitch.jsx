import { useId } from 'react';
import './ToggleSwitch.css';
import { typography } from '../../../shared-theme/themePrimitives';

export default function ToggleSwitch({
  label,
  className = '',
  id,
  style,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const classes = ['toggle-switch-atom', className].filter(Boolean).join(' ');

  return (
    <label className={classes} htmlFor={inputId} style={{ fontFamily: typography.fontFamily, ...style }}>
      <input className="toggle-switch-atom__input" id={inputId} type="checkbox" role="switch" {...props} />
      <span className="toggle-switch-atom__track" aria-hidden="true">
        <span className="toggle-switch-atom__thumb" />
      </span>
      {label != null && <span className="toggle-switch-atom__label">{label}</span>}
    </label>
  );
}
