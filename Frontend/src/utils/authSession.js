// Session helpers usable outside React components (axios interceptors, utils).
// Components should prefer useSelector/useDispatch.
import { store, persistor } from "../redux/store";
import { logout, selectRole, selectUserId } from "../redux/slices/authSlice";
import { clearSiteEngineerProfileCache } from "./siteEngineerProfileCache";
import { clearLastVisitedProjectTabs } from "./projectDetailsTabStorage";

export const getToken = () => localStorage.getItem("token");
export const getCurrentUserId = () => selectUserId(store.getState());
export const getCurrentRole = () => selectRole(store.getState());

// Clears the JWT, user-scoped caches and the Redux auth state.
// User-scoped caches are keyed by user id, so they are cleared before the state reset.
export function clearAuthSession() {
  clearSiteEngineerProfileCache();
  clearLastVisitedProjectTabs();
  localStorage.removeItem("token");
  store.dispatch(logout());
  // Write the reset state to storage right away, before any full page reload.
  return persistor.flush();
}
