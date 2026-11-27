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

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  // Only the auth slice is persisted. It never contains the JWT,
  // which lives only in the backend's HTTP-only cookie.
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

// Auth keys older versions of the app wrote directly to localStorage,
// including the JWT ("token"), which is now kept only in an HTTP-only cookie.
const LEGACY_AUTH_KEYS = ["token", "IsLogin", "User_id", "name", "organizationId", "role", "organizationName"];

// Remove any leftover JWT or user details from localStorage. A legacy token
// cannot be moved into the HTTP-only cookie, so those users sign in again;
// SessionGate clears a persisted session the backend no longer accepts.
function migrateLegacyAuthStorage() {
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export const persistor = persistStore(store, null, migrateLegacyAuthStorage);
