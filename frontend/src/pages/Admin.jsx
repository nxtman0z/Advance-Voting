import AdminPanel from "../components/AdminPanel";
import { useAuth } from "../context/AuthContext";
import { FiShield } from "react-icons/fi";

export default function Admin() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <FiShield size={48} className="mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="mt-2">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <FiShield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">Manage elections, voters, and blockchain deployments</p>
        </div>
      </div>
      <AdminPanel />
    </div>
  );
}
