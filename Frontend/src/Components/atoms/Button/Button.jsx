import './Button.css';
import { buttonSizing, iconSizes, typography } from '../../../shared-theme/themePrimitives';
import { Icon } from '../Icon/Icon';

export default function Button({
  children,
  className = '',
  type = 'button',
  style,
  icon,
  iconOnlyButton: camelCaseIconOnly,
  'icon-only-button': kebabCaseIconOnly,
  state,
  ...props
}) {
  const iconOnlyVariant = camelCaseIconOnly ?? kebabCaseIconOnly;
  const stateIcons = {
    running: 'spinner',
    completed: 'done',
    failed: 'multiply',
  };
  const stateIcon = stateIcons[state];
  const iconVariant = iconOnlyVariant || icon;
  const hasIcon = Boolean(iconVariant);
  const isIconOnly = Boolean(iconOnlyVariant);
  const classes = [
    'button-atom',
    'button-atom--primary',
    stateIcon && `button-atom--${state}`,
    isIconOnly && 'button-atom--icon-only',
    className,
  ].filter(Boolean).join(' ');
  const buttonStyle = {
    fontFamily: typography.fontFamily,
    '--button-width': buttonSizing.width,
    '--button-height': buttonSizing.height,
    '--button-border-radius': buttonSizing.borderRadius,
    '--button-padding-block': buttonSizing.paddingBlock,
    '--button-padding-inline': buttonSizing.paddingInline,
    '--button-border-width': buttonSizing.borderWidth,
    '--button-font-size': buttonSizing.fontSize,
    '--button-focus-outline-width': buttonSizing.focusOutlineWidth,
    '--button-focus-outline-offset': buttonSizing.focusOutlineOffset,
    '--button-icon-gap': buttonSizing.iconGap,
    '--button-icon-size': iconSizes.button,
    '--button-icon-only-width': buttonSizing.iconOnlyWidth,
    '--button-icon-only-padding': buttonSizing.iconOnlyPadding,
    '--button-primary-color': buttonSizing.primaryColor,
    '--button-primary-hover-color': buttonSizing.primaryHoverColor,
    '--button-primary-hover-text-color': buttonSizing.primaryHoverTextColor,
    ...style,
  };

  return (
    <button
      className={classes}
      type={type}
      style={buttonStyle}
      aria-busy={state === 'running' || undefined}
      {...props}
    >
      {stateIcon ? (
        <span className="button-atom__state-icons" aria-hidden="true">
          {Object.entries(stateIcons).map(([buttonState, variantName]) => (
            <Icon
              key={buttonState}
              variant={variantName}
              size="button"
              gradient={null}
              className={`button-atom__state-icon button-atom__state-icon--${buttonState}`}
            />
          ))}
        </span>
      ) : hasIcon ? (
        <Icon
          variant={iconVariant}
          size="button"
          gradient={null}
          className="button-atom__icon"
        />
      ) : null}
      {!isIconOnly && (hasIcon ? <span>{children}</span> : children)}
    </button>
  );
}