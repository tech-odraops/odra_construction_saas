// Session helpers usable outside React components (axios interceptors, utils).
// Components should prefer useSelector/useDispatch.
// The JWT is held only in an HTTP-only cookie managed by the backend, so there
// is nothing token-related to read or clear here.
import { store, persistor } from "../redux/store";
import { logout, selectIsLogin, selectRole, selectUserId } from "../redux/slices/authSlice";
import { clearSiteEngineerProfileCache } from "./siteEngineerProfileCache";
import { clearLastVisitedProjectTabs } from "./projectDetailsTabStorage";

export const getIsLogin = () => selectIsLogin(store.getState());
export const getCurrentUserId = () => selectUserId(store.getState());
export const getCurrentRole = () => selectRole(store.getState());

// Clears user-scoped caches and the Redux auth state on this device.
// It does not clear the auth cookie: use logoutUser() (services/authService)
// for a user-initiated logout so the backend clears it too.
// User-scoped caches are keyed by user id, so they are cleared before the state reset.
export function clearAuthSession() {
  clearSiteEngineerProfileCache();
  clearLastVisitedProjectTabs();
  store.dispatch(logout());
  // Write the reset state to storage right away, before any full page reload.
  return persistor.flush();
}
