import { createSlice } from "@reduxjs/toolkit";

// The JWT is intentionally NOT part of this slice. It stays in localStorage
// under the "token" key so it is never written into the redux-persist blob.
const initialState = {
  isLogin: false,
  userId: null,
  name: "",
  role: null,
  organizationId: null,
  organizationName: "",
};

const toIdString = (value) => (value === undefined || value === null || value === "" ? null : String(value));

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Accepts the backend auth response shape ({ User_id, name, role, organizationId }).
    loginSuccess: (state, action) => {
      const { User_id, userId, name, role, organizationId, organizationName } = action.payload || {};
      state.isLogin = true;
      state.userId = toIdString(userId ?? User_id);
      state.name = name || "";
      state.role = role || null;
      state.organizationId = toIdString(organizationId);
      state.organizationName = organizationName || "";
    },
    updateUser: (state, action) => {
      const updates = action.payload || {};
      ["name", "role", "organizationName"].forEach((field) => {
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
export const selectRole = (state) => state.auth.role;
export const selectOrganizationId = (state) => state.auth.organizationId;
export const selectOrganizationName = (state) => state.auth.organizationName;

export default authSlice.reducer;
