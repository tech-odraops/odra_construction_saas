import { createSlice } from "@reduxjs/toolkit";

// The JWT is intentionally NOT part of this slice. It lives only in an
// HTTP-only cookie set by the backend and is never readable from JavaScript.
// isLogin is a UI hint restored by redux-persist; the session is confirmed
// against the backend (/token/me) on startup by SessionGate.
const initialState = {
  isLogin: false,
  userId: null,
  name: "",
  email: "",
  role: null,
  organizationId: null,
  organizationName: "",
};

const toIdString = (value) => (value === undefined || value === null || value === "" ? null : String(value));

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Accepts the backend auth response shape ({ User_id, name, email, role, organizationId }).
    loginSuccess: (state, action) => {
      const { User_id, userId, name, email, role, organizationId, organizationName } = action.payload || {};
      state.isLogin = true;
      state.userId = toIdString(userId ?? User_id);
      state.name = name || "";
      state.email = email || "";
      state.role = role || null;
      state.organizationId = toIdString(organizationId);
      state.organizationName = organizationName || "";
    },
    updateUser: (state, action) => {
      const updates = action.payload || {};
      ["name", "email", "role", "organizationName"].forEach((field) => {
        if (updates[field] !== undefined) state[field] = updates[field];
      });
      if (updates.organizationId !== undefined) state.organizationId = toIdString(updates.organizationId);
      if (updates.userId !== undefined) state.userId = toIdString(updates.userId);
    },
    logout: () => initialState,
  },
});

export const { loginSuccess, updateUser, logout } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectIsLogin = (state) => state.auth.isLogin;
export const selectUserId = (state) => state.auth.userId;
export const selectUserName = (state) => state.auth.name;
export const selectUserEmail = (state) => state.auth.email;
export const selectRole = (state) => state.auth.role;
export const selectOrganizationId = (state) => state.auth.organizationId;
export const selectOrganizationName = (state) => state.auth.organizationName;

export default authSlice.reducer;
