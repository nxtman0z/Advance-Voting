/**
 * Results.jsx
 * Shows all elections with their parties, vote counts, progress bars, and winner.
 */
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = API_BASE.replace("/api", "") + "/uploads";

export default function Results() {
  const { API } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await API.get("/vote/results");
      setElections(data.data || []);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchResults(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Loading results…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Election Results</h1>
          <p className="text-slate-400 text-sm mt-1">Live results from all elections</p>
        </div>
        <button
          onClick={() => fetchResults(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
        >
          <span className={refreshing ? "animate-spin inline-block" : ""}>⟳</span>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {elections.length === 0 ? (
        <div className="text-center text-slate-400 py-20">
          No election results available yet.
        </div>
      ) : (
        <div className="space-y-8">
          {elections.map((election) => {
            const ended = new Date() >= new Date(election.endTime);
            const maxVotes = Math.max(...(election.parties || []).map((p) => p.voteCount), 1);

            return (
              <div
                key={election._id}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6"
              >
                {/* Election header */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-white">{election.title}</h2>
                    <p className="text-slate-400 text-sm">
                      {election.state} · {election.totalVotes} total votes
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Ends: {new Date(election.endTime).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      election.status === "active"
                        ? "bg-green-600/20 border-green-500/40 text-green-300"
                        : election.status === "ended"
                        ? "bg-slate-600/20 border-slate-500/40 text-slate-400"
                        : "bg-yellow-600/20 border-yellow-500/40 text-yellow-300"
                    }`}
                  >
                    {election.status}
                  </span>
                </div>

                {/* Winner banner */}
                {ended && election.winner && (
                  <div className="mb-5 p-4 bg-yellow-600/15 border border-yellow-500/30 rounded-xl flex items-center gap-4">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <p className="text-yellow-300 font-bold text-sm">Winner</p>
                      <p className="text-white font-bold text-lg">{election.winner.partyName}</p>
                      <p className="text-slate-300 text-sm">{election.winner.candidateName} · {election.winner.voteCount} votes</p>
                    </div>
                    {election.winner.partySymbol && (
                      <img
                        src={`${UPLOADS_BASE}/parties/${election.winner.partySymbol}`}
                        className="w-16 h-16 object-contain ml-auto rounded-lg bg-white/5 p-1"
                        alt=""
                      />
                    )}
                  </div>
                )}

                {/* Party bars */}
                {(election.parties || []).length === 0 ? (
                  <p className="text-slate-500 text-sm">No parties added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {election.parties.map((party, idx) => {
                      const pct = election.totalVotes > 0
                        ? Math.round((party.voteCount / election.totalVotes) * 100)
                        : 0;
                      const isWinner = ended && election.winner?._id === party._id;

                      return (
                        <div
                          key={party._id}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                            isWinner
                              ? "bg-yellow-600/10 border border-yellow-500/30"
                              : "bg-slate-700/20 border border-slate-700/30"
                          }`}
                        >
                          {/* Rank */}
                          <div className="w-7 text-center text-sm font-bold text-slate-500">
                            {isWinner ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </div>

                          {/* Symbol */}
                          {party.partySymbol ? (
                            <img
                              src={`${UPLOADS_BASE}/parties/${party.partySymbol}`}
                              className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1 shrink-0"
                              alt={party.partyName}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-700/50 shrink-0" />
                          )}

                          {/* Name + bar */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="font-semibold text-white text-sm">{party.partyName}</span>
                                <span className="text-slate-400 text-xs ml-2">· {party.candidateName}</span>
                              </div>
                              <span className="text-white font-bold text-sm shrink-0 ml-2">
                                {party.voteCount} <span className="text-slate-400 font-normal">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  isWinner ? "bg-yellow-500" : "bg-blue-500"
                                }`}
                                style={{
                                  width: `${(party.voteCount / maxVotes) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Candidate photo */}
                          {party.candidatePhoto && (
                            <img
                              src={`${UPLOADS_BASE}/parties/${party.candidatePhoto}`}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                              alt=""
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
