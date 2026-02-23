import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { FiMenu, FiX, FiUser, FiLogOut } from "react-icons/fi";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Vote", path: "/vote", protected: true, voterOnly: true },
    { label: "Results", path: "/results" },
    ...(user?.role === "admin"
      ? [{ label: "Admin Panel", path: "/admin", protected: true }]
      : [{ label: "Dashboard", path: "/dashboard", protected: true }]
    ),
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ─── Logo ─────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Pollaris" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-lg gradient-text hidden sm:block">
              Pollaris
            </span>
          </Link>

          {/* ─── Desktop Nav Links ────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              (!link.protected || user) && (!link.voterOnly || user?.role !== "admin") && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(link.path)
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* ─── Right Side ───────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user?.role === "admin" ? "bg-purple-600" : "bg-blue-600"}`}>
                    {user.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm text-slate-200">{user.fullName?.split(" ")[0]}</span>
                    {user?.role === "admin" && (
                      <span className="text-xs text-purple-400 font-bold">Admin</span>
                    )}
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 card p-1 animate-fadeInUp">
                    <div className="px-3 py-2 border-b border-slate-700 mb-1">
                      <p className="text-xs text-slate-400">{user.email}</p>
                      <span
                        className={user.isVerified ? "badge-success mt-1 inline-block" : "badge-warning mt-1 inline-block"}
                      >
                        {user.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                      onClick={() => { setDropdownOpen(false); navigate(user?.role === "admin" ? "/admin" : "/dashboard"); }}
                    >
                      <FiUser /> {user?.role === "admin" ? "Admin Panel" : "Dashboard"}
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      onClick={handleLogout}
                    >
                      <FiLogOut /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Login</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-4">Register</Link>
              </div>
            )}
          </div>

          {/* ─── Mobile Menu Toggle ───────────────────────────────── */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* ─── Mobile Menu ──────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-700 px-4 py-4 space-y-2 animate-fadeInUp">
          {navLinks.map((link) => (
            (!link.protected || user) && (!link.voterOnly || user?.role !== "admin") && (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                  isActive(link.path) ? "bg-blue-600/20 text-blue-400" : "text-slate-300"
                }`}
              >
                {link.label}
              </Link>
            )
          ))}
          {user ? (
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400">
              Logout
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary text-sm flex-1 text-center">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm flex-1 text-center">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
