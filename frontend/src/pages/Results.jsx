import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import ResultChart from "../components/ResultChart";
import CandidateCard from "../components/CandidateCard";
import { FiRefreshCw, FiBarChart2, FiPieChart, FiAward } from "react-icons/fi";
import toast from "react-hot-toast";

export default function Results() {
  const { API } = useAuth();
  const { getResultsFromChain, isConnected } = useWeb3();

  const [elections, setElections]         = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [results, setResults]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [chartType, setChartType]         = useState("doughnut");
  const [dataSource, setDataSource]       = useState("backend"); // "backend" | "chain"

  useEffect(() => { fetchElections(); }, []);
  useEffect(() => { if (selectedId) fetchResults(selectedId); }, [selectedId, dataSource]);

  const fetchElections = async () => {
    try {
      const { data } = await API.get("/vote/elections");
      setElections(data.data);
      if (data.data.length > 0) setSelectedId(data.data[0].onChainId);
    } catch { toast.error("Failed to load elections"); }
  };

  const fetchResults = async (id) => {
    setLoading(true);
    try {
      if (dataSource === "chain" && isConnected) {
        const res = await getResultsFromChain(id);
        setResults(res);
      } else {
        const { data } = await API.get(`/vote/results/${id}`);
        setResults({
          candidates: data.data.results,
          totalVotes: data.data.election.totalVotes,
          election: data.data.election,
          winner: data.data.winner,
        });
      }
    } catch { toast.error("Failed to load results"); }
    finally { setLoading(false); }
  };

  const sortedCandidates = results?.candidates
    ? [...results.candidates].sort((a, b) => b.voteCount - a.voteCount)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Election Results</h1>
        <p className="text-slate-400 mt-2">Transparent, real-time results powered by blockchain</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {elections.length > 0 && (
          <select
            className="input-field max-w-xs"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {elections.map((el) => (
              <option key={el._id} value={el.onChainId}>{el.title}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setDataSource((p) => p === "backend" ? "chain" : "backend")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
            dataSource === "chain"
              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
              : "bg-slate-700/50 border-slate-600 text-slate-300"
          }`}
        >
          {dataSource === "chain" ? "On-chain Data" : "Cached Data"}
        </button>

        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setChartType("doughnut")}
            className={`p-2 rounded-md transition-colors ${chartType === "doughnut" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            <FiPieChart size={16} />
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`p-2 rounded-md transition-colors ${chartType === "bar" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            <FiBarChart2 size={16} />
          </button>
        </div>

        <button
          onClick={() => selectedId && fetchResults(selectedId)}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 py-2"
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : results ? (
        <div className="grid lg:grid-cols-2 gap-6 animate-fadeInUp">
          {/* Chart */}
          <div className="card p-6">
            <h2 className="font-bold text-white mb-1">Vote Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Total votes: {results.totalVotes}</p>
            <ResultChart
              candidates={sortedCandidates}
              totalVotes={results.totalVotes}
              chartType={chartType}
            />
          </div>

          {/* Candidate Ranking */}
          <div className="space-y-3">
            {/* Winner spotlight */}
            {sortedCandidates.length > 0 && results.totalVotes > 0 && (
              <div className="card p-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2 text-sm">
                  <FiAward /> Leading Candidate
                </div>
                <p className="text-xl font-bold text-white">{sortedCandidates[0].name}</p>
                <p className="text-slate-400 text-sm">{sortedCandidates[0].party}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-yellow-400 font-bold">{sortedCandidates[0].voteCount} votes</span>
                  <span className="text-slate-400 text-sm">
                    ({((sortedCandidates[0].voteCount / results.totalVotes) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}

            {/* All candidates */}
            <div className="space-y-3">
              {sortedCandidates.map((c, i) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  showVoteCount
                  totalVotes={results.totalVotes}
                  rank={i + 1}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <FiBarChart2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>Select an election to view results</p>
        </div>
      )}
    </div>
  );
}
