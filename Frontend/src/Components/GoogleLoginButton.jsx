import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axiosInstance from "../utils/axiosInstance"
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getFCMToken } from "../services/notificationService";

export default function GoogleLoginButton() {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    flow: "auth-code", // requests authorization code (not access token)
    scope: "openid profile email", // basic user info

    onSuccess: async ({ code }) => {
      try {
        // Send the code to your backend for verification & token exchange
        const res = await axiosInstance.post("/auth/google", { code , origin: window.location.origin});

        // if the response is 200
        if(res.status === 200 && res.data.success){
          console.log("User logged in successfully");
          localStorage.setItem("token",res.data.token);
          localStorage.setItem("User_id",res.data.User_id);
          localStorage.setItem("IsLogin", true);
          localStorage.setItem("name",res.data.name);

          // generate token
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            await axiosInstance.post("/notification/fcm-token", {
              fcmToken
            });
          }

          toast.success("Logged in with Google successfully!");

          navigate(res.data.redirect);
        }else{
          console.log("Error during google login");
          toast.error(res.data?.error || "Error during Google login");
          navigate(res.data.redirect);
        }
      } catch (err) {
        console.error("Error during backend exchange:", err);
        toast.error("Google login failed. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Google Login Failed:", error);
      toast.error("Google login failed. Please try again.");
      navigate("/");
    },
  });

  return (
    <button
      onClick={() => login()}
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        padding: "10px 10px",
        borderRadius: "50px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",

      }}
    >
      <img
        src="https://developers.google.com/identity/images/g-logo.png"
        alt="Google Logo"
        width="20"
        height="20"
      />
      {/* <span>Sign in with Google</span> */}
    </button>
  );
}
