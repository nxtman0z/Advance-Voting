import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (expired/invalidated token)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Reload to reset all React state and redirect to home
      const publicPaths = ["/", "/login", "/results", "/register"];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpVerified, setOtpVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  // ─── Load User on Mount ───────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    try {
      const { data } = await API.get("/auth/me");
      setUser(data.data);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  // ─── Register ─────────────────────────────────────────────────────────
  const register = async (formData) => {
    const { data } = await API.post("/auth/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    localStorage.setItem("token", data.token);
    setUser(data.data);
    return data;
  };

  // ─── Login ────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.data);
    toast.success(`Welcome back, ${data.data.fullName}!`);
    return data;
  };
  // ─── Admin Wallet Login ───────────────────────────────────────────
  const adminWalletLogin = async ({ address, signature, message }) => {
    const { data } = await API.post("/auth/admin-wallet-login", { address, signature, message });
    localStorage.setItem("token", data.token);
    setUser(data.data);
    return data;
  };
  // ─── Logout ───────────────────────────────────────────────────────────
  const logout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    localStorage.removeItem("token");
    setUser(null);
    setOtpVerified(false);
    setFaceVerified(false);
    toast.success("Logged out successfully");
  };

  // ─── Verify OTP ───────────────────────────────────────────────────────
  const verifyOTP = async (otp) => {
    const { data } = await API.post("/vote/otp/verify", { otp });
    setOtpVerified(true);
    toast.success("OTP verified successfully!");
    return data;
  };

  // ─── Send OTP ─────────────────────────────────────────────────────────
  const sendOTP = async (via = "email") => {
    const { data } = await API.post("/vote/otp/send", { via });
    return data;  // caller handles toast/message
  };

  // ─── Register Face ────────────────────────────────────────────────────
  const registerFace = async (faceDescriptor) => {
    const { data } = await API.post("/auth/register-face", { faceDescriptor });
    setUser((prev) => ({ ...prev, isFaceRegistered: true }));
    toast.success("Face registered successfully!");
    return data;
  };

  // ─── Update Wallet ────────────────────────────────────────────────────
  const updateWallet = async (walletAddress) => {
    const { data } = await API.patch("/auth/update-wallet", { walletAddress });
    setUser((prev) => ({ ...prev, walletAddress }));
    return data;
  };

  // ─── Update Profile (photo, address, dob, bio, socials) ──────────────
  const updateProfile = async (formData) => {
    const { data } = await API.patch("/auth/update-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setUser(data.data);
    return data;
  };

  // ─── Verify Account ───────────────────────────────────────────────────
  const verifyAccount = async (otp) => {
    const { data } = await API.post("/auth/verify-account", { otp });
    setUser((prev) => ({ ...prev, isVerified: true }));
    toast.success("Account verified!");
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, otpVerified, faceVerified,
        setFaceVerified, setOtpVerified,
        register, login, adminWalletLogin, logout,
        verifyOTP, sendOTP, registerFace,
        updateWallet, updateProfile, verifyAccount,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
