import { useCallback, useEffect, useRef, useState } from "react";
import PopupContext from "./PopupContext";

export default function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);
  const timeoutRef = useRef(null);

  const dismissPopup = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setPopup(null);
  }, []);

  const showPopup = useCallback((options = {}) => {
    const { duration = 3000, ...content } = options;
    window.clearTimeout(timeoutRef.current);
    setPopup(content);

    if (duration > 0) {
      timeoutRef.current = window.setTimeout(() => setPopup(null), duration);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return (
    <PopupContext.Provider value={{ popup, showPopup, dismissPopup }}>
      {children}
    </PopupContext.Provider>
  );
}
