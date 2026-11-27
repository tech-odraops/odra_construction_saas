import { useEffect, useState } from "react";
import { restoreSession } from "../services/authService";
import FullScreenLoader from "./FullScreenLoader";

// Rendered inside PersistGate, so the persisted auth state is already loaded.
// Before rendering the app (and its protected routes) it confirms that
// session with the backend, because the HTTP-only cookie cannot be inspected
// from JavaScript and a persisted isLogin alone is not proof of a valid session.
export default function SessionGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    restoreSession().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return <FullScreenLoader />;
  return children;
}
