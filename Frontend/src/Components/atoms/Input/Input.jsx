import { useId, useState } from "react";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { Icon } from "../Icon/Icon";
import Button from "../Button/Button";
import { colors, componentStyles } from "../../../shared-theme/themePrimitives";
import "./Input.css";
import i18n from "../../../i18n";

const ValidationMessages = {
  error: i18n.t("validation.required"),
  success: i18n.t("validation.success"),
};

export default function Input({
  className = "",
  disabled = false,
  icon,
  iconColor,
  endIcon,
  endIconColor,
  id,
  label,
  looksGood = true,
  required = false,
  type = "text",
  rows = 4,
  validationState,
  validationMessage,
  select = false,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  const generatedId = useId();
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;
  
  const message = validationMessage ? validationMessage :looksGood
    ? ValidationMessages[validationState]
    : { ...ValidationMessages, success: undefined }[validationState];
  
  const isTextarea = type === "textarea";
  const isSelect = select;
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  const classes = [
    "input-atom",
    isTextarea && "input-atom--textarea",
    isSelect && "input-atom--select",
    disabled && "input-atom--disabled",
    validationState && `input-atom--${validationState}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const describedBy =
    [ariaDescribedBy, message && messageId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="input-atom__field" style={componentStyles.input}>
      {label && (
        <label className="input-atom__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="input-atom__required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}

      <div className={classes}>
        {(disabled || icon) && (
          <Icon
            variant={disabled ? "lock" : icon}
            size="lg"
            gradient="primary"
            className="input-atom__icon"
            style={
              iconColor && !disabled
                ? { "--input-icon-color": iconColor }
                : undefined
            }
          />
        )}

        {isTextarea ? (
          <textarea
            {...props}
            id={inputId}
            rows={rows}
            required={required}
            className="input-atom__control"
            disabled={disabled}
            aria-invalid={validationState === "error" || undefined}
            aria-describedby={describedBy}
          />
        ) : isSelect ? (
          <select
            {...props}
            id={inputId}
            required={required}
            className="input-atom__control"
            disabled={disabled}
            aria-invalid={validationState === "error" || undefined}
            aria-describedby={describedBy}
          >
            {children}
          </select>
        ) : (
          <input
            {...props}
            id={inputId}
            type={inputType}
            required={required}
            className="input-atom__control"
            disabled={disabled}
            aria-invalid={validationState === "error" || undefined}
            aria-describedby={describedBy}
          />
        )}

        {isPassword && (
          <Button
            iconOnly
            border={false}
            className="input-atom__password-toggle"
            type="button"
            bgColor="transparent"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            disabled={disabled}
          >
            {showPassword ? (
              <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
            ) : (
              <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
            )}
          </Button>
        )}

        {!isTextarea && (endIcon || validationState === "success") && (
          <Icon
            variant={validationState === "success" ? "check-mark" : endIcon}
            size="md"
            gradient={validationState === "success" ? "success" : "primary"}
            className="input-atom__end-icon"
            style={
              validationState !== "success" && endIconColor
                ? {
                    "--input-icon-color": endIconColor,
                  }
                : {
                    "--input-icon-color": colors.inputSuccess,
                  }
            }
          />
        )}
      </div>

      {message && (
        <span id={messageId} className="input-atom__message" aria-live="polite">
          {message}
        </span>
      )}
    </div>
  );
}
