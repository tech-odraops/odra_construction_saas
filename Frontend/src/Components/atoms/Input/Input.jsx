import { useId } from 'react';
import { Icon } from '../Icon/Icon';
import { inputSizing, typography } from '../../../shared-theme/themePrimitives';
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
  const fieldStyle = {
    fontFamily: typography.fontFamily,
    '--input-width': inputSizing.width,
    '--input-height': inputSizing.height,
    '--input-padding-block': inputSizing.paddingBlock,
    '--input-padding-inline': inputSizing.paddingInline,
    '--input-border-width': inputSizing.borderWidth,
    '--input-border-radius': inputSizing.borderRadius,
    '--input-icon-gap': inputSizing.iconGap,
    '--input-border-color': inputSizing.borderColor,
    '--input-background-color': inputSizing.backgroundColor,
    '--input-focus-border-color': inputSizing.focusBorderColor,
    '--input-error-color': inputSizing.errorColor,
    '--input-success-color': inputSizing.successColor,
    '--input-disabled-background-color': inputSizing.disabledBackgroundColor,
    '--input-placeholder-color': inputSizing.placeholderColor,
    '--input-message-margin-top': inputSizing.messageMarginTop,
    '--input-message-font-size': inputSizing.messageFontSize,
    '--input-message-font-weight': inputSizing.messageFontWeight,
    '--input-message-line-height': inputSizing.messageLineHeight,
    '--input-message-letter-spacing': inputSizing.messageLetterSpacing,
  };

  return (
    <div className="input-atom__field" style={fieldStyle}>
      <div className={classes}>
        {(disabled || icon) && (
          <Icon
            variant={disabled ? 'lock' : icon}
            size="button"
            gradient="primary"
            className="input-atom__icon"
            style={{
              backgroundColor: disabled
                ? inputSizing.borderColor
                : (iconColor || inputSizing.iconColor),
            }}
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
