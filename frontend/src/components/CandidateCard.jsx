import { FiCheckCircle, FiUser, FiAward } from "react-icons/fi";

/**
 * CandidateCard component
 * Props:
 *  - candidate: { id, name, party, imageHash, voteCount }
 *  - onVote(candidateId) — called when Vote button is clicked
 *  - selected: boolean — highlights selected card
 *  - voted: boolean — disables voting
 *  - showVoteCount: boolean — shows vote count (results mode)
 *  - totalVotes: number — used to compute percentage
 *  - rank: number — 1 = winner
 */
export default function CandidateCard({
  candidate,
  onVote,
  selected = false,
  voted = false,
  showVoteCount = false,
  totalVotes = 0,
  rank = null,
}) {
  const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;
  const isWinner = rank === 1 && showVoteCount;

  return (
    <div
      className={`card p-5 transition-all duration-300 cursor-pointer relative overflow-hidden ${
        selected
          ? "border-blue-500 bg-blue-500/10 shadow-blue-500/20 shadow-lg scale-[1.02]"
          : isWinner
          ? "border-yellow-500/50 bg-yellow-500/5"
          : "hover:border-slate-600 hover:shadow-lg"
      } ${voted && !selected ? "opacity-60" : ""}`}
      onClick={() => !voted && onVote && onVote(candidate.id)}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 px-2 py-1 rounded-full text-xs font-semibold">
          <FiAward size={12} /> Winner
        </div>
      )}

      {/* Rank */}
      {rank && showVoteCount && (
        <div
          className={`absolute top-0 left-0 w-8 h-8 flex items-center justify-center text-xs font-bold rounded-br-lg ${
            rank === 1 ? "bg-yellow-500 text-black" :
            rank === 2 ? "bg-slate-400 text-black" :
            rank === 3 ? "bg-amber-700 text-white" :
            "bg-slate-700 text-slate-300"
          }`}
        >
          #{rank}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-blue-600" : "bg-slate-700"
        }`}>
          {candidate.imageHash && candidate.imageHash.startsWith("http") ? (
            <img src={candidate.imageHash} alt={candidate.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <FiUser size={28} className={selected ? "text-white" : "text-slate-400"} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-lg leading-tight">{candidate.name}</h3>
            {selected && <FiCheckCircle className="text-blue-400 flex-shrink-0" />}
          </div>
          <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
            {candidate.party}
          </span>

          {/* Results Bar */}
          {showVoteCount && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{candidate.voteCount} votes</span>
                <span className="font-semibold text-white">{percentage}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    isWinner ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vote button */}
      {onVote && !showVoteCount && (
        <button
          onClick={(e) => { e.stopPropagation(); !voted && onVote(candidate.id); }}
          disabled={voted}
          className={`w-full mt-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selected
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : voted
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          }`}
        >
          {voted ? (selected ? "✓ Your Vote" : "Voted") : selected ? "Confirm Vote" : "Select"}
        </button>
      )}
    </div>
  );
}
