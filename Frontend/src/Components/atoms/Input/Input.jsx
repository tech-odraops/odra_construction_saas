import { useId } from 'react';
import { Icon } from '../Icon/Icon';
import { componentStyles } from '../../../shared-theme/themePrimitives';
import './Input.css';

const validationMessages = {
  error: 'This field is required.',
  success: 'Looks good!',
};

export default function Input({
  className = '',
  disabled = false,
  icon,
  iconColor,
  endIcon,
  endIconColor,
  id,
  validationState,
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  const generatedId = useId();
  const messageId = `${id || generatedId}-message`;
  const message = validationMessages[validationState];
  const classes = [
    'input-atom',
    disabled && 'input-atom--disabled',
    validationState && `input-atom--${validationState}`,
    className,
  ].filter(Boolean).join(' ');
  const describedBy = [ariaDescribedBy, message && messageId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="input-atom__field" style={componentStyles.input}>
      <div className={classes}>
        {(disabled || icon) && (
          <Icon
            variant={disabled ? 'lock' : icon}
            size="button"
            gradient="primary"
            className="input-atom__icon"
            style={iconColor && !disabled ? { '--input-icon-color': iconColor } : undefined}
          />
        )}
        <input
          {...props}
          id={id}
          className="input-atom__control"
          disabled={disabled}
          aria-invalid={validationState === 'error' || undefined}
          aria-describedby={describedBy}
        />
        {endIcon && (
          <Icon
            variant={endIcon}
            size="button"
            gradient="primary"
            className="input-atom__end-icon"
            style={endIconColor ? { '--input-icon-color': endIconColor } : undefined}
          />
        )}
      </div>
      {message && (
        <span
          id={messageId}
          className="input-atom__message"
          aria-live="polite"
        >
          {message}
        </span>
      )}
    </div>
  );
}
