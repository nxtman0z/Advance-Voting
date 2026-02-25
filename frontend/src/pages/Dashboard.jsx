import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiEdit2, FiX, FiCamera, FiMapPin, FiCalendar, FiTwitter, FiLinkedin, FiFileText } from "react-icons/fi";

const API_BASE   = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_ORIGIN = API_BASE.replace("/api", "");

// â”€â”€â”€ Edit Profile Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EditProfileModal({ user, onClose, onSave }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(
    user.photo ? `${API_ORIGIN}/uploads/photos/${user.photo}` : null
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    address:      user.address      || "",
    dateOfBirth:  user.dateOfBirth  ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    bio:          user.bio          || "",
    twitterHandle: user.socialLinks?.twitter  || "",
    linkedinUrl:   user.socialLinks?.linkedin || "",
  });
  const [saving, setSaving] = useState(false);

  function handlePhoto(e) {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (photoFile)           fd.append("photo",         photoFile);
      if (form.address)        fd.append("address",       form.address);
      if (form.dateOfBirth)    fd.append("dateOfBirth",   form.dateOfBirth);
      if (form.bio)            fd.append("bio",           form.bio);
      if (form.twitterHandle)  fd.append("twitterHandle", form.twitterHandle);
      if (form.linkedinUrl)    fd.append("linkedinUrl",   form.linkedinUrl);

      // send even empty strings to clear fields
      fd.set("address",       form.address);
      fd.set("bio",           form.bio);
      fd.set("twitterHandle", form.twitterHandle);
      fd.set("linkedinUrl",   form.linkedinUrl);
      if (form.dateOfBirth)   fd.set("dateOfBirth", form.dateOfBirth);

      await onSave(fd);
      toast.success("Profile updated!");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg,#0e1729,#0b1120)", border: "1px solid rgba(99,102,241,.2)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Photo picker */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {preview ? (
                  <img src={preview} alt="preview" className="w-24 h-24 rounded-full object-cover object-top ring-4 ring-blue-500/40" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600/20 ring-4 ring-blue-500/40 flex items-center justify-center text-3xl text-blue-400 font-bold">
                    {user.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg transition-colors"
                >
                  <FiCamera size={13} className="text-white" />
                </button>
              </div>
              <p className="text-slate-500 text-xs">Click the camera icon to change photo</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Bio */}
            <div>
              <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1.5"><FiFileText size={12} /> Bio <span className="text-slate-600">(optional)</span></label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell voters a bit about yourselfâ€¦"
                maxLength={300}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none transition-all"
                style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,102,241,.2)" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,.6)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(99,102,241,.2)")}
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1.5"><FiMapPin size={12} /> Address <span className="text-slate-600">(optional)</span></label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Your city or state"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,102,241,.2)" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,.6)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(99,102,241,.2)")}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1.5"><FiCalendar size={12} /> Date of Birth <span className="text-slate-600">(optional)</span></label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,102,241,.2)", colorScheme: "dark" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,.6)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(99,102,241,.2)")}
              />
            </div>

            {/* Social links */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1.5"><FiTwitter size={12} /> Twitter handle</label>
                <input
                  type="text"
                  value={form.twitterHandle}
                  onChange={(e) => setForm((p) => ({ ...p, twitterHandle: e.target.value }))}
                  placeholder="@username"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                  style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,102,241,.2)" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,.6)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(99,102,241,.2)")}
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mb-1.5"><FiLinkedin size={12} /> LinkedIn URL</label>
                <input
                  type="text"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                  placeholder="linkedin.com/in/â€¦"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                  style={{ background: "rgba(15,23,42,.8)", border: "1px solid rgba(99,102,241,.2)" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,.6)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(99,102,241,.2)")}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3 flex-shrink-0 border-t border-white/5 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,.05)" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-2xl text-sm text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
            >
              {saving ? "Savingâ€¦" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Dashboard() {
  const { user, updateProfile, API } = useAuth();
  const navigate = useNavigate();
  const [myVotes, setMyVotes] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

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
    ? `${API_ORIGIN}/uploads/photos/${user.photo}`
    : null;

  const votedElectionIds = new Set(
    (myVotes?.votedElections || []).map((v) => v.electionId)
  );

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* â”€â”€â”€ Profile Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8 relative">

        {/* Edit button */}
        <button
          onClick={() => setEditOpen(true)}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all"
          style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)" }}
        >
          <FiEdit2 size={11} /> Edit Profile
        </button>

        {/* avatar */}
        <div className="shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Your photo"
              className="w-28 h-28 rounded-full object-cover object-top ring-4 ring-blue-500/40"
              onError={(e) => { e.target.style.display = "none"; }}
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
          <p className="text-slate-400 text-sm mb-1">{user.email}</p>
          {user.bio && <p className="text-slate-400 text-sm italic mb-3">"{user.bio}"</p>}

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-sm mt-3">
            <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg">
              ðŸ“ž {user.phone || "â€”"}
            </span>
            {user.voterId && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg font-mono">
                ðŸªª {user.voterId}
              </span>
            )}
            {user.gender && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg capitalize">
                {user.gender === "male" ? "â™‚" : user.gender === "female" ? "â™€" : "âš§"} {user.gender}
              </span>
            )}
            {user.address && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg">
                ðŸ“ {user.address}
              </span>
            )}
            {user.dateOfBirth && (
              <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-3 py-1 rounded-lg">
                ðŸŽ‚ {new Date(user.dateOfBirth).toLocaleDateString()}
              </span>
            )}
            <span className={`px-3 py-1 rounded-lg border ${
              user.role === "admin"
                ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                : "bg-blue-600/20 border-blue-500/40 text-blue-300"
            }`}>
              {user.role === "admin" ? "âš™ Admin" : "ðŸ—³ Voter"}
            </span>
            <span className={`px-3 py-1 rounded-lg border ${
              user.isVerified
                ? "bg-green-600/20 border-green-500/40 text-green-300"
                : "bg-yellow-600/20 border-yellow-500/40 text-yellow-300"
            }`}>
              {user.isVerified ? "âœ“ Verified" : "âš  Unverified"}
            </span>
          </div>

          {/* Social links */}
          {(user.socialLinks?.twitter || user.socialLinks?.linkedin) && (
            <div className="flex gap-3 mt-3 justify-center sm:justify-start">
              {user.socialLinks?.twitter && (
                <a href={`https://twitter.com/${user.socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  <FiTwitter size={12} /> {user.socialLinks.twitter}
                </a>
              )}
              {user.socialLinks?.linkedin && (
                <a href={user.socialLinks.linkedin.startsWith("http") ? user.socialLinks.linkedin : `https://${user.socialLinks.linkedin}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <FiLinkedin size={12} /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        {/* vote stats */}
        <div className="shrink-0 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {(myVotes?.votedElections || []).length}
          </div>
          <div className="text-slate-400 text-sm">Elections Voted</div>
        </div>
      </div>

      {/* â”€â”€â”€ Elections Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <h2 className="text-xl font-bold text-white mb-4">Elections</h2>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading electionsâ€¦</div>
      ) : elections.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center text-slate-400">
          No elections available at the moment. Check back later!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {elections.map((election) => {
            const voted      = votedElectionIds.has(election.onChainId);
            const isActive   = election.status === "active";
            const isUpcoming = election.status === "upcoming";
            const canVote    = isActive && !voted;

            return (
              <div key={election._id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{election.title}</h3>
                    <p className="text-slate-400 text-sm">{election.state}</p>
                  </div>
                  {voted ? (
                    <span className="text-xs bg-green-600/20 border border-green-500/40 text-green-300 px-2 py-1 rounded-full whitespace-nowrap">âœ“ Voted</span>
                  ) : isUpcoming ? (
                    <span className="text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded-full whitespace-nowrap">ðŸ• Upcoming</span>
                  ) : (
                    <span className="text-xs bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 px-2 py-1 rounded-full whitespace-nowrap">â— Pending</span>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>{election.parties?.length || 0} parties Â· Ends {new Date(election.endTime).toLocaleDateString()}</div>
                  {isUpcoming && <div className="text-blue-400/70">Starts {new Date(election.startTime).toLocaleDateString()}</div>}
                </div>

                {canVote && (
                  <button onClick={() => navigate("/vote")} className="mt-auto w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                    Vote Now â†’
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

      {/* â”€â”€â”€ Voting History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(myVotes?.votedElections || []).length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Voting History</h2>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50">
            {myVotes.votedElections.map((v, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm">Election #{v.electionId}</p>
                  <p className="text-slate-500 text-xs">{new Date(v.votedAt).toLocaleString()}</p>
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

      {/* â”€â”€â”€ Edit Profile Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSave={updateProfile}
        />
      )}
    </div>
  );
}
