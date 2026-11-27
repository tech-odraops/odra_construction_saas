// Auth API calls. Kept separate from utils/authSession.js so that
// axiosInstance -> authSession does not import axiosInstance back.
import axiosInstance from "../utils/axiosInstance";
import { store } from "../redux/store";
import { loginSuccess, updateUser } from "../redux/slices/authSlice";
import { clearAuthSession, getCurrentUserId, getIsLogin } from "../utils/authSession";

// Requests made with this flag never trigger the global "session expired"
// redirect in the axios 401 interceptor; the caller handles the result.
export const SKIP_SESSION_EXPIRED = { skipSessionExpiredHandling: true };

// User-initiated logout: asks the backend to clear the HTTP-only cookie, then
// clears local state. Local state is cleared even if the request fails.
export async function logoutUser() {
  try {
    await axiosInstance.post("/auth/logout", {}, SKIP_SESSION_EXPIRED);
  } catch (error) {
    console.error("Logout request failed; clearing the local session anyway.", error?.message);
  }
  await clearAuthSession();
}

let restorePromise = null;

// Confirms the persisted Redux session against the backend on startup.
// The browser sends the HTTP-only cookie automatically.
// - No persisted session: nothing to verify.
// - 200: refresh the user details in Redux.
// - 401/403: the cookie is missing, expired or no longer valid -> clear the session.
// - Network/5xx errors: keep the session; later API calls will 401 if it is invalid.
// Memoized so StrictMode's double effects send only one request.
export function restoreSession() {
  if (restorePromise) return restorePromise;

  restorePromise = (async () => {
    if (!getIsLogin()) return;

    try {
      const { data } = await axiosInstance.get("/token/me", SKIP_SESSION_EXPIRED);
      const sameUser = String(data.User_id) === String(getCurrentUserId());

      if (sameUser) {
        store.dispatch(updateUser({
          name: data.name,
          email: data.email,
          role: data.role,
          organizationId: data.organizationId,
        }));
      } else {
        // The cookie belongs to a different account than the persisted state.
        await clearAuthSession();
        store.dispatch(loginSuccess(data));
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        await clearAuthSession();
      } else {
        console.error("Could not verify the session; keeping the local session.", error?.message);
      }
    }
  })();

  return restorePromise;
}
