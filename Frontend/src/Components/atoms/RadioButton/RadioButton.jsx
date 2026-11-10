import { useId } from 'react';
import './RadioButton.css';
import { componentStyles } from '../../../shared-theme/themePrimitives';

export default function RadioButton({
  label,
  className = '',
  id,
  style,
  size = 'md',
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const classes = ['radio-button-atom', `radio-button-atom--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={classes}
      htmlFor={inputId}
      style={{ ...componentStyles.radioButton, ...style }}
    >
      <input className="radio-button-atom__input" id={inputId} type="radio" {...props} />
      <span className="radio-button-atom__control" aria-hidden="true" />
      {label != null && <span className="radio-button-atom__label">{label}</span>}
    </label>
  );
}
