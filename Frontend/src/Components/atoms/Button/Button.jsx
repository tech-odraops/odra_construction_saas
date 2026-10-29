import { createElement } from "react";
import "./Button.css";
import { componentStyles } from "../../../shared-theme/themePrimitives";
import { Icon } from "../Icon/Icon";

const stateIcons = {
  running: "spinner",
  completed: "done",
  failed: "multiply",
};

export default function Button({
  children,
  className = "",
  type = "button",
  style,
  icon,
  iconOnly = false,
  variant = "primary",
  component = "button",
  startIcon,
  endIcon,
  fullWidth = false,
  size = "default",
  state,
  border = true,
  bgColor,
  ...props
}) {
  const stateIcon = stateIcons[state];
  const hasIcon = Boolean(icon);
  const classes = [
    "button-atom",
    `button-atom--${variant}`,
    stateIcon && `button-atom--${state}`,
    iconOnly && "button-atom--icon-only",
    fullWidth && "button-atom--full-width",
    !border && "button-atom--no-border",
    size !== "default" && `button-atom--${size}`,
    className,
  ].filter(Boolean).join(" ");

  const buttonStyle = {
    ...componentStyles.button,
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...style,
  };

  const content = (
    <>
      {startIcon}
      {stateIcon ? (
        <Icon
          variant={stateIcon}
          size="button"
          gradient={null}
          className="button-atom__state-icon"
        />
      ) : hasIcon ? (
        <Icon
          variant={icon}
          size="button"
          gradient={null}
          className="button-atom__icon"
        />
      ) : null}
      {children}
      {endIcon}
    </>
  );

  return createElement(component, {
    ...props,
    className: classes,
    type: component === "button" ? type : undefined,
    style: buttonStyle,
    "aria-busy": state === "running" || undefined,
  }, content);
}
