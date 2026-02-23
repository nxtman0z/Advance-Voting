ï»¿/**
 * Admin.jsx  -  full admin panel with 3 tabs:
 *   1. Dashboard (stats + elections + party vote counts)
 *   2. Create Election (form Ã¢â â blockchain + MongoDB)
 *   3. Add Party / Candidate (select election, upload images)
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = API_BASE.replace("/api", "") + "/uploads";

const TABS = ["Dashboard", "Create Election", "Add Party", "Voters"];

export default function Admin() {
  const { user, API } = useAuth();
  const [tab, setTab] = useState(0);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <span className="text-5xl mb-4"></span>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="mt-2">You need admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-2xl"></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm">Manage elections, parties and vote counts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-8 inline-flex">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabDashboard API={API} />}
      {tab === 1 && <TabCreateElection API={API} onCreated={() => setTab(0)} />}
      {tab === 2 && <TabAddParty API={API} />}
      {tab === 3 && <TabVoters API={API} />}
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
// TAB 1: Dashboard
// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
        {[
          { label: "Total Voters", value: data.totalVoters, color: "blue" },
          { label: "Elections", value: data.totalElections, color: "purple" },
          { label: "Active", value: data.activeElections, color: "green" },
          { label: "Parties", value: data.totalParties, color: "yellow" },
        ].map((s) => (
          <div key={s.label} className={`bg-${s.color}-600/10 border border-${s.color}-500/30 rounded-xl p-4`}>
            <div className={`text-2xl font-bold text-${s.color}-400`}>{s.value}</div>
            <div className="text-slate-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Elections */}
      <h2 className="text-xl font-bold text-white">All Elections</h2>
      {data.elections.length === 0 ? (
        <p className="text-slate-400">No elections yet. Create one!</p>
      ) : (
        <div className="space-y-4">
          {data.elections.map((election) => (
            <div
              key={election._id}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{election.title}</h3>
                  <p className="text-slate-400 text-sm">
                    {election.state} · onChainId: #{election.onChainId ?? "-"} · {election.totalVotes} votes
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
          <h2 className="text-xl font-bold text-white">Recent Registrations</h2>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50">
            {data.recentUsers.map((u) => (
              <div key={u._id} className="p-4 flex items-center gap-4">
                {u.photo ? (
                  <img
                    src={`${UPLOADS_BASE}/photos/${u.photo}`}
                    className="w-10 h-10 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold">
                    {u.fullName?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-medium">{u.fullName}</p>
                  <p className="text-slate-500 text-xs">{u.email} · {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
// TAB 2: Create Election
// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
      toast.success(`Election created! On-chain ID: #${data.data.onChainId}`);
      setForm({ title: "", description: "", state: "", startTime: "", endTime: "" });
      onCreated?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-white mb-6">Create New Election</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Election Title *"
          value={form.title}
          onChange={(v) => setForm((f) => ({ ...f, title: v }))}
          placeholder="e.g. Uttar Pradesh Vidhan Sabha 2025"
        />
        <Field
          label="State / Area"
          value={form.state}
          onChange={(v) => setForm((f) => ({ ...f, state: v }))}
          placeholder="e.g. Uttar Pradesh"
        />
        <div>
          <label className="block text-slate-300 text-sm mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Brief description of this election"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm mb-1">Start Time *</label>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1">End Time *</label>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
          ⚠️ Creating will deploy the election to the Sepolia blockchain immediately. This may take 15-30 seconds.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deploying to blockchain...
            </span>
          ) : (
            "Create Election on Blockchain"
          )}
        </button>
      </form>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
// TAB 3: Add Party / Candidate
// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬
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
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-white mb-6">Add Party / Candidate</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Election selector */}
        <div>
          <label className="block text-slate-300 text-sm mb-1">Election *</label>
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {elections.length === 0 ? (
              <option value="">No deployed elections</option>
            ) : (
              elections.map((el) => (
                <option key={el._id} value={el._id}>{el.title} (#{el.onChainId})</option>
              ))
            )}
          </select>
        </div>

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
        <div>
          <label className="block text-slate-300 text-sm mb-1">Candidate Bio</label>
          <textarea
            value={form.candidateBio}
            onChange={(e) => setForm((f) => ({ ...f, candidateBio: e.target.value }))}
            rows={2}
            className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Short candidate description"
          />
        </div>

        {/* Image uploads */}
        <ImageUpload
          label="Party Symbol * (required)"
          preview={previews.partySymbol}
          onChange={(f) => handleFile("partySymbol", f)}
        />
        <ImageUpload
          label="Party Banner (optional)"
          preview={previews.partyImage}
          onChange={(f) => handleFile("partyImage", f)}
        />
        <ImageUpload
          label="Candidate Photo (optional)"
          preview={previews.candidatePhoto}
          onChange={(f) => handleFile("candidatePhoto", f)}
          round
        />

        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300">
          ⚠️ Adding a party will call <code>addCandidate</code> on the blockchain. This requires gas and takes ~15 seconds.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Adding to blockchain...
            </span>
          ) : (
            "Add Party + Candidate"
          )}
        </button>
      </form>
    </div>
  );
}

// Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ Shared subcomponents Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬

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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></span>
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
                <span className={`px-2 py-0.5 rounded-full border font-medium ${u.isVerified ? "bg-green-600/20 border-green-500/30 text-green-300" : "bg-yellow-600/20 border-yellow-500/30 text-yellow-300"}`}>{u.isVerified ? "v Verified" : "Note: Unverified"}</span>
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
          <button onClick={() => { const p = Math.max(1, page-1); setPage(p); load(search, gender, status, p); }} disabled={page===1} className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40">< Prev</button>
          <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => { const p = Math.min(totalPages, page+1); setPage(p); load(search, gender, status, p); }} disabled={page===totalPages} className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40">Next -></button>
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
      <label className="block text-slate-300 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function ImageUpload({ label, preview, onChange, round = false }) {
  const fileRef = useRef(null);
  return (
    <div>
      <label className="block text-slate-300 text-sm mb-1">{label}</label>
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-600/50 hover:border-blue-500/50 rounded-xl p-4 text-center transition-colors"
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className={`mx-auto h-20 w-20 object-cover ${round ? "rounded-full" : "rounded-lg"} mb-2`}
          />
        ) : (
          <div className="text-slate-500 text-sm">
            <div className="text-3xl mb-1"></div>
            Click to upload
          </div>
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
