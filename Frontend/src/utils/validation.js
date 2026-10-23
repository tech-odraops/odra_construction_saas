const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValidator(emailInputValue) {
  return EMAIL_PATTERN.test(String(emailInputValue ?? "").trim());
}

export function requiredValidator(inputValue) {
  return String(inputValue ?? "").trim().length > 0;
}

export function minLengthValidator(inputValue, minLength) {
  return String(inputValue ?? "").length >= minLength;
}
