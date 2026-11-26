import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import rootReducer from "./rootReducer";
import { loginSuccess } from "./slices/authSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  // Only the auth slice is persisted. It never contains the JWT,
  // which stays in localStorage under "token".
  whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Keys the app used to write directly to localStorage before Redux was introduced.
const LEGACY_AUTH_KEYS = ["IsLogin", "User_id", "name", "organizationId", "role", "organizationName"];

// Users who were logged in before this change have their session in legacy keys.
// Move it into Redux once so they are not logged out, then remove the old keys.
function migrateLegacyAuthStorage() {
  const legacyIsLogin = localStorage.getItem("IsLogin") === "true";
  if (!store.getState().auth.isLogin && legacyIsLogin && localStorage.getItem("token")) {
    store.dispatch(loginSuccess({
      User_id: localStorage.getItem("User_id"),
      name: localStorage.getItem("name"),
      role: localStorage.getItem("role"),
      organizationId: localStorage.getItem("organizationId"),
      organizationName: localStorage.getItem("organizationName"),
    }));
  }
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export const persistor = persistStore(store, null, migrateLegacyAuthStorage);
