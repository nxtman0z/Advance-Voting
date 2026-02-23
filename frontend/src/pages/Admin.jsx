/**
 * Admin.jsx  -  full admin panel with 3 tabs:
 *   1. Dashboard (stats + elections + party vote counts)
 *   2. Create Election (form -> blockchain + MongoDB)
 *   3. Add Party / Candidate (select election, upload images)
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = API_BASE.replace("/api", "") + "/uploads";

export default function Admin() {
  const { user, API } = useAuth();
  const [tab, setTab] = useState(0);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-5xl mb-4 font-bold text-red-400">X</div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="mt-2">You need admin privileges.</p>
      </div>
    );
  }

  const TAB_LIST = [
    { label: "Dashboard",       icon: "D" },
    { label: "Create Election", icon: "+" },
    { label: "Add Party",       icon: "P" },
    { label: "Voters",          icon: "V" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ── Header Banner ───────────────────────────────────── */}
      <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/20 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl font-black text-purple-300 flex-shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-black text-white">Admin Panel</h1>
                <span className="text-xs bg-purple-600/30 border border-purple-500/40 text-purple-300 px-2.5 py-0.5 rounded-full font-bold tracking-wide">ADMIN</span>
              </div>
              <p className="text-slate-400 text-sm">{user?.email} &mdash; Full system access</p>
            </div>
          </div>
          <div className="text-sm text-slate-400 text-right">
            <p className="text-slate-500 text-xs">Logged in as</p>
            <p className="text-white font-semibold">{user?.fullName}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TAB_LIST.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === i
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${
              tab === i ? "bg-white/20" : "bg-slate-700"
            }`}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 0 && <TabDashboard API={API} />}
        {tab === 1 && <TabCreateElection API={API} onCreated={() => setTab(0)} />}
        {tab === 2 && <TabAddParty API={API} />}
        {tab === 3 && <TabVoters API={API} />}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 1: Dashboard
// -----------------------------------------------------------------------------
function TabDashboard({ API }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await API.get("/admin/dashboard");
      setData(d.data);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (electionId, status) => {
    try {
      await API.patch(`/admin/elections/${electionId}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleSyncVotes = async (electionId) => {
    setSyncing((s) => ({ ...s, [electionId]: true }));
    try {
      const { data: r } = await API.post(`/admin/elections/${electionId}/sync-votes`);
      toast.success(`Synced! Total: ${r.data.totalVotes} votes`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Sync failed");
    } finally {
      setSyncing((s) => ({ ...s, [electionId]: false }));
    }
  };

  if (loading) return <div className="text-center text-slate-400 py-16">Loading...</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-5">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Total Voters</p>
          <p className="text-4xl font-black text-white">{data.totalVoters}</p>
          <p className="text-blue-400/60 text-xs mt-1">registered accounts</p>
        </div>
        <div className="bg-purple-600/10 border border-purple-500/30 rounded-2xl p-5">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Elections</p>
          <p className="text-4xl font-black text-white">{data.totalElections}</p>
          <p className="text-purple-400/60 text-xs mt-1">total created</p>
        </div>
        <div className="bg-green-600/10 border border-green-500/30 rounded-2xl p-5">
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Active</p>
          <p className="text-4xl font-black text-white">{data.activeElections}</p>
          <p className="text-green-400/60 text-xs mt-1">live right now</p>
        </div>
        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-2xl p-5">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Parties</p>
          <p className="text-4xl font-black text-white">{data.totalParties}</p>
          <p className="text-yellow-400/60 text-xs mt-1">registered candidates</p>
        </div>
      </div>

      {/* Elections */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-white">All Elections</h2>
        <span className="text-xs bg-slate-800 border border-slate-700/50 text-slate-400 px-2.5 py-0.5 rounded-full">{data.elections.length}</span>
      </div>
      {data.elections.length === 0 ? (
        <p className="text-slate-400">No elections yet. Create one!</p>
      ) : (
        <div className="space-y-4">
          {data.elections.map((election) => (
            <div
              key={election._id}
              className={`border rounded-2xl p-5 space-y-4 transition-all ${
                election.status === "active"
                  ? "bg-green-950/20 border-green-500/20"
                  : election.status === "ended"
                  ? "bg-slate-800/30 border-slate-700/30"
                  : "bg-slate-800/60 border-slate-700/50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">{election.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      election.status === "active" ? "bg-green-600/20 text-green-400 border-green-500/30" :
                      election.status === "ended" ? "bg-slate-600/20 text-slate-400 border-slate-500/30" :
                      election.status === "upcoming" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
                      "bg-slate-600/20 text-slate-400 border-slate-500/30"
                    }`}>{election.status}</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {election.state} | {election.totalVotes} votes
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={election.status}
                    onChange={(e) => handleStatusChange(election._id, e.target.value)}
                    className="text-xs bg-slate-700 border border-slate-600/50 text-white rounded-lg px-2 py-1 focus:outline-none"
                  >
                    {["draft", "upcoming", "active", "ended"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSyncVotes(election._id)}
                    disabled={syncing[election._id]}
                    className="text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                  >
                    {syncing[election._id] ? "Syncing..." : "Sync Votes"}
                  </button>
                </div>
              </div>

              {/* Parties bar */}
              {election.parties && election.parties.length > 0 && (
                <div className="space-y-2">
                  {election.parties.map((party) => {
                    const pct = election.totalVotes > 0
                      ? Math.round((party.voteCount / election.totalVotes) * 100)
                      : 0;
                    return (
                      <div key={party._id} className="flex items-center gap-3">
                        {party.partySymbol && (
                          <img
                            src={`${UPLOADS_BASE}/parties/${party.partySymbol}`}
                            alt=""
                            className="w-8 h-8 rounded object-contain bg-white/5"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-slate-300 mb-1">
                            <span>{party.partyName} - {party.candidateName}</span>
                            <span>{party.voteCount} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent users */}
      {data.recentUsers?.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Recent Registrations</h2>
            <span className="text-xs bg-slate-800 border border-slate-700/50 text-slate-400 px-2.5 py-0.5 rounded-full">{data.recentUsers.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentUsers.map((u) => (
              <div key={u._id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
                {u.photo ? (
                  <img
                    src={`${UPLOADS_BASE}/photos/${u.photo}`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                    {u.fullName?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{u.fullName}</p>
                  <p className="text-slate-500 text-xs truncate">{u.email}</p>
                  <p className="text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 2: Create Election
// -----------------------------------------------------------------------------
function TabCreateElection({ API, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    state: "",
    startTime: "",
    endTime: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) {
      toast.error("Title, start time, and end time are required");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/admin/elections", form);
      toast.success("Election created successfully!");
      setForm({ title: "", description: "", state: "", startTime: "", endTime: "" });
      onCreated?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg flex-shrink-0">+</div>
        <div>
          <h2 className="text-xl font-bold text-white">Create New Election</h2>
          <p className="text-slate-400 text-sm">Fill in the details below to create a new election.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Basic Info */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Basic Information</p>
          <Field
            label="Election Title *"
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="e.g. Uttar Pradesh Vidhan Sabha 2025"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="State / Area"
              value={form.state}
              onChange={(v) => setForm((f) => ({ ...f, state: v }))}
              placeholder="e.g. Uttar Pradesh"
            />
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none transition-colors placeholder-slate-600"
                placeholder="Brief description of this election"
              />
            </div>
          </div>
        </div>

        {/* Card: Schedule */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Start Time *</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">End Time *</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deploying to Blockchain...
            </span>
          ) : (
            "Create Election on Blockchain"
          )}
        </button>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 3: Add Party / Candidate
// -----------------------------------------------------------------------------
function TabAddParty({ API }) {
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [form, setForm] = useState({
    partyName: "",
    candidateName: "",
    candidateBio: "",
  });
  const [files, setFiles] = useState({
    partySymbol: null,
    partyImage: null,
    candidatePhoto: null,
  });
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get("/admin/elections")
      .then(({ data }) => {
        const deployed = (data.data || []).filter((e) => e.isBlockchainDeployed);
        setElections(deployed);
        if (deployed.length > 0) setSelectedElectionId(deployed[0]._id);
      })
      .catch(() => toast.error("Failed to load elections"));
  }, []);

  const handleFile = (field, file) => {
    setFiles((f) => ({ ...f, [field]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((p) => ({ ...p, [field]: url }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedElectionId) { toast.error("Select an election"); return; }
    if (!form.partyName || !form.candidateName) {
      toast.error("Party name and candidate name are required");
      return;
    }
    if (!files.partySymbol) { toast.error("Party symbol image is required"); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append("partyName", form.partyName);
    fd.append("candidateName", form.candidateName);
    fd.append("candidateBio", form.candidateBio);
    fd.append("partySymbol", files.partySymbol);
    if (files.partyImage) fd.append("partyImage", files.partyImage);
    if (files.candidatePhoto) fd.append("candidatePhoto", files.candidatePhoto);

    try {
      const { data } = await API.post(`/admin/elections/${selectedElectionId}/parties`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Party "${form.partyName}" added! TX: ${data.txHash?.slice(0, 10)}...`);
      setForm({ partyName: "", candidateName: "", candidateBio: "" });
      setFiles({ partySymbol: null, partyImage: null, candidatePhoto: null });
      setPreviews({});
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-lg flex-shrink-0">P</div>
        <div>
          <h2 className="text-xl font-bold text-white">Add Party / Candidate</h2>
          <p className="text-slate-400 text-sm">Select a deployed election and add a party with its candidate.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Election selector */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select Election</p>
          {elections.length === 0 ? (
            <div className="flex items-center gap-3 bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
              <span className="text-yellow-400 font-bold text-sm">!</span>
              <p className="text-yellow-300 text-sm">No deployed elections found. Create an election first from the Create Election tab.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {elections.map((el) => (
                <label
                  key={el._id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedElectionId === el._id
                      ? "bg-purple-600/15 border-purple-500/50"
                      : "bg-slate-900/40 border-slate-700/40 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="election"
                    value={el._id}
                    checked={selectedElectionId === el._id}
                    onChange={() => setSelectedElectionId(el._id)}
                    className="accent-purple-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{el.title}</p>
                    <p className="text-slate-400 text-xs">{el.state}</p>
                  </div>
                  <span className="text-xs bg-green-600/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">deployed</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Card: Party + Candidate Info */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Party Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Party Name *"
              value={form.partyName}
              onChange={(v) => setForm((f) => ({ ...f, partyName: v }))}
              placeholder="e.g. Bharatiya Janata Party"
            />
            <Field
              label="Candidate Name *"
              value={form.candidateName}
              onChange={(v) => setForm((f) => ({ ...f, candidateName: v }))}
              placeholder="e.g. Narendra Modi"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Candidate Bio</label>
            <textarea
              value={form.candidateBio}
              onChange={(e) => setForm((f) => ({ ...f, candidateBio: e.target.value }))}
              rows={2}
              className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 resize-none transition-colors placeholder-slate-600"
              placeholder="Short description of the candidate"
            />
          </div>
        </div>

        {/* Card: Image uploads */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Images</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ImageUpload
              label="Party Symbol *"
              preview={previews.partySymbol}
              onChange={(f) => handleFile("partySymbol", f)}
            />
            <ImageUpload
              label="Party Banner"
              preview={previews.partyImage}
              onChange={(f) => handleFile("partyImage", f)}
            />
            <ImageUpload
              label="Candidate Photo"
              preview={previews.candidatePhoto}
              onChange={(f) => handleFile("candidatePhoto", f)}
              round
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || elections.length === 0}
          className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding to Blockchain...
            </span>
          ) : (
            "Add Party + Candidate"
          )}
        </button>
      </form>
    </div>
  );
}

// --- Shared subcomponents -----------------------------------------------------

// --- TAB 4: Voters -------------------------------------------------------------
const UPLOADS_PHOTOS = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "") + "/uploads/photos";

function TabVoters({ API }) {
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [gender,   setGender]   = useState("");
  const [status,   setStatus]   = useState("");
  const [page,     setPage]     = useState(1);
  const [toggling,  setToggling]  = useState({});
  const [deleting,   setDeleting]  = useState({});
  const [confirmDel, setConfirmDel] = useState(null); // userId to confirm
  const searchTimer = useRef(null);
  const LIMIT = 12;

  const load = async (s, g, st, p) => {
    const sr = s ?? search; const gr = g ?? gender; const str = st ?? status; const pr = p ?? page;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pr, limit: LIMIT });
      if (sr) params.set("search", sr);
      if (gr) params.set("gender", gr);
      if (str) params.set("status", str);
      const { data } = await API.get(`/admin/users?${params}`);
      setUsers(data.data);
      setTotal(data.pagination.total);
    } catch { toast.error("Failed to load voters"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(search, gender, status, page); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, gender, status, 1); }, 400);
  };

  const handleFilter = (g, st) => {
    setGender(g); setStatus(st); setPage(1);
    load(search, g, st, 1);
  };

  const handleToggle = async (userId, isActive) => {
    setToggling((t) => ({ ...t, [userId]: true }));
    try {
      await API.patch(`/admin/users/${userId}/toggle-status`);
      toast.success(isActive ? "User deactivated" : "User activated");
      load(search, gender, status, page);
    } catch { toast.error("Failed to update status"); }
    finally { setToggling((t) => ({ ...t, [userId]: false })); }
  };

  const handleDelete = async (userId) => {
    setConfirmDel(null);
    setDeleting((d) => ({ ...d, [userId]: true }));
    try {
      await API.delete(`/admin/users/${userId}`);
      toast.success("Voter removed successfully");
      load(search, gender, status, page);
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to delete voter"); }
    finally { setDeleting((d) => ({ ...d, [userId]: false })); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Registered Voters</h2>
          <p className="text-slate-400 text-sm">{total} voter{total !== 1 ? "s" : ""} found</p>
        </div>
        <button onClick={() => load(search, gender, status, page)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"> Refresh</button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-60">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">*</span>
          <input
            type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, email, phone, Voter ID..."
            className="w-full bg-slate-800/70 border border-slate-600/50 text-white placeholder-slate-600 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
          />
          {search && <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">x</button>}
        </div>
        <select value={gender} onChange={(e) => handleFilter(e.target.value, status)}
          className="bg-slate-800 border border-slate-600/50 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500">
          <option value="">All Genders</option>
          <option value="male"> Male</option>
          <option value="female"> Female</option>
          <option value="other"> Other</option>
        </select>
        <select value={status} onChange={(e) => handleFilter(gender, e.target.value)}
          className="bg-slate-800 border border-slate-600/50 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          <option value="active"> Active</option>
          <option value="inactive"> Inactive</option>
        </select>
      </div>

      {/* Active filter pills */}
      {(gender || status) && (
        <div className="flex gap-2 flex-wrap">
          {gender && <span className="bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full flex items-center gap-1">Gender: {gender} <button onClick={() => handleFilter("", status)} className="ml-1 hover:text-white">x</button></span>}
          {status && <span className="bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs px-3 py-1 rounded-full flex items-center gap-1">Status: {status} <button onClick={() => handleFilter(gender, "")} className="ml-1 hover:text-white">x</button></span>}
          <button onClick={() => handleFilter("", "")} className="text-xs text-slate-500 hover:text-slate-300 underline">Clear all</button>
        </div>
      )}

      {/* User Cards */}
      {loading ? (
        <div className="text-center text-slate-400 py-16">
          <span className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin inline-block mb-3" />
          <p>Loading voters...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-10 text-center text-slate-500">
          <p className="text-3xl mb-2"></p><p>No voters found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div key={u._id} className={`bg-slate-800/60 border rounded-xl p-4 flex flex-col gap-3 transition-all ${u.isActive ? "border-slate-700/50" : "border-red-500/20 opacity-70"}`}>
              <div className="flex items-center gap-3">
                {u.photo ? (
                  <img src={`${UPLOADS_PHOTOS}/${u.photo}`} alt={u.fullName} className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-600 flex-shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl text-blue-400 font-bold">{u.fullName?.charAt(0)?.toUpperCase() || "?"}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{u.fullName}</p>
                  <p className="text-slate-500 text-xs truncate">{u.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <VRow icon="" value={u.phone || "-"} />
                <VRow icon={u.gender === "male" ? "" : u.gender === "female" ? "" : ""} value={u.gender ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : "-"} />
                <div className="col-span-2"><VRow icon="" value={u.voterId || "-"} mono /></div>
                <VRow icon="" value={new Date(u.createdAt).toLocaleDateString()} />
                <VRow icon="" value={u.isFaceRegistered ? "Face OK" : "No face"} />
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className={`px-2 py-0.5 rounded-full border font-medium ${u.isVerified ? "bg-green-600/20 border-green-500/30 text-green-300" : "bg-yellow-600/20 border-yellow-500/30 text-yellow-300"}`}>{u.isVerified ? "✓ Verified" : "Unverified"}</span>
                <span className={`px-2 py-0.5 rounded-full border font-medium ${u.isActive ? "bg-blue-600/20 border-blue-500/30 text-blue-300" : "bg-red-600/20 border-red-500/30 text-red-300"}`}>{u.isActive ? "Active" : "Inactive"}</span>
                {u.isBlockedFromVoting && <span className="px-2 py-0.5 rounded-full border bg-red-600/20 border-red-500/30 text-red-300 font-medium">Blocked</span>}
              </div>
              <div className="flex gap-2 pt-1 border-t border-slate-700/50">
                <button onClick={() => handleToggle(u._id, u.isActive)} disabled={toggling[u._id]}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${u.isActive ? "bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20" : "bg-green-600/10 border-green-500/30 text-green-400 hover:bg-green-600/20"} disabled:opacity-50`}>
                  {toggling[u._id] ? "..." : u.isActive ? "Deactivate" : "Activate"}
                </button>
                {confirmDel === u._id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(u._id)} disabled={deleting[u._id]}
                      className="text-xs px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
                      {deleting[u._id] ? "..." : "Yes"}
                    </button>
                    <button onClick={() => setConfirmDel(null)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(u._id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600/50 bg-slate-700/40 hover:bg-red-600/20 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors" title="Delete voter">
                    
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => { const p = Math.max(1, page-1); setPage(p); load(search, gender, status, p); }} disabled={page===1} className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40">Prev</button>
          <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => { const p = Math.min(totalPages, page+1); setPage(p); load(search, gender, status, p); }} disabled={page===totalPages} className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function VRow({ icon, value, mono = false }) {
  return (
    <div className="flex items-center gap-1 text-slate-400 min-w-0">
      <span className="flex-shrink-0">{icon}</span>
      <span className={`truncate ${mono ? "font-mono text-slate-300" : ""}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
      />
    </div>
  );
}

function ImageUpload({ label, preview, onChange, round = false }) {
  const fileRef = useRef(null);
  return (
    <div>
      <label className="block text-slate-300 text-sm font-medium mb-2">{label}</label>
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-600/50 hover:border-purple-500/50 bg-slate-900/40 hover:bg-purple-600/5 rounded-xl p-4 text-center transition-all min-h-[100px] flex flex-col items-center justify-center gap-2"
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className={`mx-auto h-20 w-20 object-cover ${round ? "rounded-full ring-2 ring-purple-500/40" : "rounded-lg"}`}
          />
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center text-slate-400 text-xl font-bold">+</div>
            <p className="text-slate-500 text-xs">Click to upload</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files[0] || null)}
        />
      </div>
    </div>
  );
}
