import { useContext } from "react";
import PopupContext from "./PopupContext";

export default function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
}
