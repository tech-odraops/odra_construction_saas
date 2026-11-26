import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsLogin, selectRole } from "../redux/slices/authSlice";

export default function AdminRoute({ children }) {

  const token = localStorage.getItem("token");
  const isLogin = useSelector(selectIsLogin);
  const role = useSelector(selectRole);

  // If not logged in
  if (!token || !isLogin) {
    return <Navigate to="/admin/login" />;
  }

  // If logged in but not admin
  if (role !== "admin") {
    return <Navigate to="/" />;
  }

  return children;
}
