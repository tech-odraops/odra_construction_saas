let popupListener = null;
let pendingPopups = [];

function dispatchPopup(variant, content, options = {}) {
  const title = options.title || (variant === "error" ? "Error" : variant === "info" ? "Information" : "Success");
  const message = content ?? "";
  const duration = options.duration ?? (options.autoClose === false ? 0 : options.autoClose ?? 3000);
  const { autoClose: _autoClose, ...extraOptions } = options;

  const popup = { ...extraOptions, variant: variant === "error" ? "error" : "success", title, message, duration };
  if (popupListener) popupListener(popup);
  else pendingPopups.push(popup);
}

export const popupToast = {
  success: (content, options) => dispatchPopup("success", content, options),
  error: (content, options) => dispatchPopup("error", content, options),
  info: (content, options) => dispatchPopup("info", content, options),
};

export function subscribeToPopups(listener) {
  popupListener = listener;
  pendingPopups.forEach(listener);
  pendingPopups = [];
  return () => {
    if (popupListener === listener) popupListener = null;
  };
}
