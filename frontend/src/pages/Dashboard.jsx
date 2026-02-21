import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Dashboard() {
  const { user, API } = useAuth();
  const navigate = useNavigate();
  const [myVotes, setMyVotes] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [votesRes, electionsRes] = await Promise.all([
          API.get("/vote/my-votes"),
          API.get("/vote/elections"),
        ]);
        setMyVotes(votesRes.data.data);
        setElections(electionsRes.data.data || []);
      } catch (err) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (!user) return null;

  const photoUrl = user.photo
    ? `${API_BASE.replace("/api", "")}/uploads/photos/${user.photo}`
    : null;

  const votedElectionIds = new Set(
    (myVotes?.votedElections || []).map((v) => v.electionId)
  );

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* ─── Header / Profile Card ─────────────────────────────── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8">
        {/* avatar */}
        <div className="shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Your photo"
              className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-500/40"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-blue-600/30 flex items-center justify-center ring-4 ring-blue-500/40">
              <span className="text-4xl text-blue-400 font-bold">
                {user.fullName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>

        {/* info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white mb-1">{user.fullName}</h1>
          <p className="text-slate-400 text-sm mb-3">{user.email}</p>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-sm">
            <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg">
              📞 {user.phone || "—"}
            </span>
            {user.voterId && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg font-mono">
                🪪 {user.voterId}
              </span>
            )}
            {user.gender && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg capitalize">
                {user.gender === "male" ? "♂" : user.gender === "female" ? "♀" : "⚧"} {user.gender}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-lg border ${
                user.role === "admin"
                  ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                  : "bg-blue-600/20 border-blue-500/40 text-blue-300"
              }`}
            >
              {user.role === "admin" ? "⚙ Admin" : "🗳 Voter"}
            </span>
            <span
              className={`px-3 py-1 rounded-lg border ${
                user.isVerified
                  ? "bg-green-600/20 border-green-500/40 text-green-300"
                  : "bg-yellow-600/20 border-yellow-500/40 text-yellow-300"
              }`}
            >
              {user.isVerified ? "✓ Verified" : "⚠ Unverified"}
            </span>
          </div>
        </div>

        {/* vote stats */}
        <div className="shrink-0 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {(myVotes?.votedElections || []).length}
          </div>
          <div className="text-slate-400 text-sm">Elections Voted</div>
        </div>
      </div>

      {/* ─── Elections Status ──────────────────────────────────── */}
      <h2 className="text-xl font-bold text-white mb-4">Elections</h2>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading elections…</div>
      ) : elections.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center text-slate-400">
          No elections available at the moment. Check back later!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {elections.map((election) => {
            const voted    = votedElectionIds.has(election.onChainId);
            const isActive = election.status === "active";
            const isUpcoming = election.status === "upcoming";
            const canVote   = isActive && !voted;

            return (
              <div
                key={election._id}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{election.title}</h3>
                    <p className="text-slate-400 text-sm">{election.state}</p>
                  </div>
                  {voted ? (
                    <span className="text-xs bg-green-600/20 border border-green-500/40 text-green-300 px-2 py-1 rounded-full whitespace-nowrap">
                      ✓ Voted
                    </span>
                  ) : isUpcoming ? (
                    <span className="text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded-full whitespace-nowrap">
                      🕐 Upcoming
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 px-2 py-1 rounded-full whitespace-nowrap">
                      ◍ Pending
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>{election.parties?.length || 0} parties · Ends {new Date(election.endTime).toLocaleDateString()}</div>
                  {isUpcoming && (
                    <div className="text-blue-400/70">Starts {new Date(election.startTime).toLocaleDateString()}</div>
                  )}
                </div>

                {canVote && (
                  <button
                    onClick={() => navigate("/vote")}
                    className="mt-auto w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    Vote Now →
                  </button>
                )}
                {isUpcoming && (
                  <div className="mt-auto w-full py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 text-sm text-center">
                    Voting opens soon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Voting History ────────────────────────────────────── */}
      {(myVotes?.votedElections || []).length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Voting History</h2>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50">
            {myVotes.votedElections.map((v, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm">Election #{v.electionId}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(v.votedAt).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`https://sepolia.etherscan.io/tx/${v.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  View TX
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
