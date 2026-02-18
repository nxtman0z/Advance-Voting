import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import toast from "react-hot-toast";
import {
  FiUsers, FiList, FiCheckCircle, FiActivity,
  FiPlus, FiToggleLeft, FiSend, FiRefreshCw,
} from "react-icons/fi";

export default function AdminPanel() {
  const { API, user } = useAuth();
  const { account } = useWeb3();

  const [activeTab, setActiveTab]       = useState("dashboard");
  const [stats, setStats]               = useState(null);
  const [users, setUsers]               = useState([]);
  const [elections, setElections]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [createForm, setCreateForm]     = useState({
    title: "", description: "", electionType: "general",
    startTime: "", endTime: "",
    candidates: [{ name: "", party: "", imageHash: "" }],
  });

  // ─── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "users")     fetchUsers();
    if (activeTab === "elections") fetchElections();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const { data } = await API.get("/admin/dashboard");
      setStats(data.data);
    } catch { toast.error("Failed to load stats"); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/admin/users");
      setUsers(data.data);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const fetchElections = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/admin/elections");
      setElections(data.data);
    } catch { toast.error("Failed to load elections"); }
    finally { setLoading(false); }
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/elections", createForm);
      toast.success("Election created!");
      setActiveTab("elections");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create election"); }
  };

  const handleDeployElection = async (id) => {
    try {
      await API.post(`/admin/elections/${id}/deploy`);
      toast.success("Election deployed to blockchain!");
      fetchElections();
    } catch (err) { toast.error(err.response?.data?.message || "Deploy failed"); }
  };

  const handleToggleUser = async (id) => {
    try {
      await API.patch(`/admin/users/${id}/toggle-status`);
      toast.success("User status updated");
      fetchUsers();
    } catch { toast.error("Failed to update user"); }
  };

  const addCandidateField = () => {
    setCreateForm((prev) => ({
      ...prev,
      candidates: [...prev.candidates, { name: "", party: "", imageHash: "" }],
    }));
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: FiActivity },
    { id: "elections", label: "Elections", icon: FiList },
    { id: "users",     label: "Users",     icon: FiUsers },
    { id: "create",    label: "New Election", icon: FiPlus },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600/20 text-blue-400 border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard ──────────────────────────────────────────────── */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-6 animate-fadeInUp">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Voters", value: stats.totalUsers,      color: "blue" },
              { label: "Elections",    value: stats.totalElections,   color: "green" },
              { label: "Active",       value: stats.activeElections,  color: "yellow" },
              { label: "Verified",     value: stats.verifiedUsers,    color: "purple" },
            ].map((s) => (
              <div key={s.label} className="card p-5 text-center">
                <div className={`text-3xl font-bold text-${s.color}-400`}>{s.value}</div>
                <div className="text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Recent Registrations</h3>
            <div className="space-y-3">
              {stats.recentUsers?.map((u) => (
                <div key={u._id} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <div>
                    <p className="text-sm font-medium text-white">{u.fullName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                  <span className={u.isVerified ? "badge-success" : "badge-warning"}>
                    {u.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Elections ──────────────────────────────────────────────── */}
      {activeTab === "elections" && (
        <div className="space-y-4 animate-fadeInUp">
          <button onClick={fetchElections} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <FiRefreshCw size={14} /> Refresh
          </button>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading elections...</div>
          ) : elections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No elections yet. Create one!</div>
          ) : elections.map((el) => (
            <div key={el._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white">{el.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{el.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={
                      el.status === "active"   ? "badge-success" :
                      el.status === "upcoming" ? "badge-warning"  :
                      el.status === "ended"    ? "badge-danger"   : "bg-slate-700/50 text-slate-400 text-xs px-2 py-1 rounded-full"
                    }>{el.status}</span>
                    {el.isBlockchainDeployed && <span className="badge-success">On-chain ✓</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(el.startTime).toLocaleDateString()} — {new Date(el.endTime).toLocaleDateString()}
                  </p>
                </div>
                {!el.isBlockchainDeployed && (
                  <button
                    onClick={() => handleDeployElection(el._id)}
                    className="btn-primary text-sm py-2 flex items-center gap-1 whitespace-nowrap"
                  >
                    <FiSend size={13} /> Deploy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Users ──────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-3 animate-fadeInUp">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading users...</div>
          ) : users.map((u) => (
            <div key={u._id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {u.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{u.fullName}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={u.isVerified ? "badge-success" : "badge-warning"}>
                  {u.isVerified ? "Verified" : "Unverified"}
                </span>
                <span className={u.isFaceRegistered ? "badge-success" : "badge-danger"}>
                  {u.isFaceRegistered ? "Face ✓" : "No Face"}
                </span>
                <button
                  onClick={() => handleToggleUser(u._id)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                    u.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  }`}
                >
                  <FiToggleLeft size={12} /> {u.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Create Election ─────────────────────────────────────────── */}
      {activeTab === "create" && (
        <form onSubmit={handleCreateElection} className="space-y-5 animate-fadeInUp max-w-2xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Election Title *</label>
              <input className="input-field" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-300 mb-1">Description</label>
              <textarea className="input-field h-24 resize-none" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Start Time *</label>
              <input type="datetime-local" className="input-field" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">End Time *</label>
              <input type="datetime-local" className="input-field" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Candidates</h3>
              <button type="button" onClick={addCandidateField} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                <FiPlus size={12} /> Add
              </button>
            </div>
            {createForm.candidates.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 mb-3 p-3 bg-slate-800/50 rounded-lg">
                <input className="input-field text-sm py-2" placeholder="Name *" value={c.name} onChange={(e) => { const u = [...createForm.candidates]; u[i].name = e.target.value; setCreateForm({ ...createForm, candidates: u }); }} required />
                <input className="input-field text-sm py-2" placeholder="Party *" value={c.party} onChange={(e) => { const u = [...createForm.candidates]; u[i].party = e.target.value; setCreateForm({ ...createForm, candidates: u }); }} required />
                <input className="input-field text-sm py-2" placeholder="Image URL" value={c.imageHash} onChange={(e) => { const u = [...createForm.candidates]; u[i].imageHash = e.target.value; setCreateForm({ ...createForm, candidates: u }); }} />
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            <FiCheckCircle /> Create Election
          </button>
        </form>
      )}
    </div>
  );
}
