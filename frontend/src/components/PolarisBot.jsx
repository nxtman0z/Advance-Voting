import { useState, useRef, useEffect } from "react";

// ── Knowledge base ──────────────────────────────────────────────────────────
const FAQS = [
  // Greetings
  { tags: ["hi", "hello", "hey", "hii", "helo", "namaste", "namaskar"],
    answer: "👋 Hey! I'm **PolarisBot** — your guide to the Pollaris voting platform. Ask me anything about registering, voting, OTP, face scan, or elections!" },

  // What is Pollaris
  { tags: ["what is pollaris", "pollaris kya hai", "about pollaris", "about this app", "ye app kya hai", "platform kya hai"],
    answer: "🗳️ **Pollaris** is a decentralized blockchain-based e-voting platform. It uses:\n- **Ethereum blockchain** for tamper-proof vote recording\n- **Face recognition** to verify your identity\n- **OTP verification** (email) for 2-factor auth\n- **MetaMask wallet** to ensure one vote per person" },

  // How to register
  { tags: ["register", "registration", "sign up", "signup", "account", "kaise banau", "kaise register", "new account"],
    answer: "📝 **How to Register:**\n1. Click **Register** on the top menu\n2. Fill in: Full Name, Email, Phone, Voter ID, Gender, Password\n3. Upload your photo\n4. Submit — you'll get a verification email\n5. After admin approval you'll be **Verified** ✓" },

  // How to vote
  { tags: ["vote", "voting", "kaise vote", "vote karna", "cast vote", "how to vote", "vote dale"],
    answer: "🗳️ **How to Vote:**\n1. Login to your account\n2. Go to **Vote** page\n3. Select your election & party\n4. Complete **Face Verification** (webcam required)\n5. Enter the **OTP** sent to your email\n6. Confirm your vote — it's recorded on Ethereum blockchain!" },

  // Face verification / biometric
  { tags: ["face", "biometric", "face scan", "face verify", "webcam", "face recognition", "chehra", "face register", "face nhi kar rha"],
    answer: "🤳 **Face Verification:**\n- You need a webcam for face scan\n- During **voting**, your live face is matched against your registered face\n- Make sure you registered your face descriptor during account setup\n- Good lighting helps — avoid backlighting\n- If it fails, try again in better lighting" },

  // OTP
  { tags: ["otp", "one time password", "otp nhi aya", "otp verify", "email otp", "verification code", "code nhi aya"],
    answer: "📧 **OTP Verification:**\n- OTP is sent to your **registered email**\n- Check your spam/junk folder if not received\n- OTP expires in **10 minutes**\n- Only email OTP is currently supported\n- Make sure your email is correct in your profile" },

  // MetaMask / Wallet
  { tags: ["metamask", "wallet", "ethereum", "web3", "connect wallet", "metamask kya hai", "wallet nhi hai", "crypto wallet"],
    answer: "🦊 **MetaMask Wallet:**\n- MetaMask is a free browser extension/app\n- Install it from [metamask.io](https://metamask.io)\n- Admin login requires MetaMask for identity signing\n- Voting requires MetaMask to record your vote on Ethereum blockchain\n- Signing is **free** — it doesn't cost any ETH" },

  // Elections
  { tags: ["election", "elections", "current election", "kaunsa election", "election list", "koi election nhi", "election kab hai"],
    answer: "📋 **Elections:**\n- Active elections are shown on the **Vote** page\n- Each election has a start & end time\n- You can vote only during the active window\n- Results are visible on the **Results** page after voting closes\n- Elections are created and managed by the admin" },

  // Results
  { tags: ["result", "results", "winner", "kaun jeeta", "vote count", "kitne vote", "election result"],
    answer: "📊 **Election Results:**\n- Go to **Results** in the navigation menu\n- Results are publicly visible — no login needed\n- Shows vote count for each party per election\n- Vote counts are fetched directly from the blockchain — 100% transparent" },

  // Login issues
  { tags: ["login", "login nhi ho rha", "password", "forgot password", "sign in", "can't login", "login problem"],
    answer: "🔐 **Login Help:**\n- Use your registered **email + password**\n- Make sure your account is **Verified** by admin\n- If account is **Inactive** contact admin\n- Admin login is separate — go to `/admin-login` for admin access\n- Password reset is handled by admin currently" },

  // Account verification
  { tags: ["verify", "verified", "not verified", "unverified", "pending", "approval", "verify nhi hua"],
    answer: "✅ **Account Verification:**\n- After registration, admin manually verifies accounts\n- You'll see **Verified** badge once approved\n- Only verified & active accounts can vote\n- Contact admin at **admin@pollaris.com** if your account is pending too long" },

  // Admin
  { tags: ["admin", "admin panel", "admin login", "admin kaise login", "who is admin"],
    answer: "🛡️ **Admin Panel:**\n- Admin login is at the **Admin Login** page\n- Requires MetaMask wallet signing\n- Admin can: create elections, add parties, verify voters, view results\n- Admin credentials are restricted — contact the system operator" },

  // Security
  { tags: ["secure", "security", "safe", "kya safe hai", "hack", "tamper", "manipulate", "fraud"],
    answer: "🔒 **Security Features:**\n- **Blockchain** — votes are immutable once recorded\n- **Face biometric** — only you can vote with your face\n- **OTP** — 2-factor authentication\n- **MetaMask signing** — cryptographic wallet identity\n- **One vote per wallet** — enforced by smart contract\n- Votes cannot be changed or deleted after submission" },

  // How it works
  { tags: ["how does it work", "kaise kaam karta hai", "working", "process", "steps", "how"],
    answer: "⚙️ **How Pollaris Works:**\n1. **Register** with your details & photo\n2. **Get verified** by admin\n3. **Register face** biometric for voting\n4. **Connect MetaMask** wallet\n5. **Vote** → face verify → OTP → confirm\n6. Vote is written to **Ethereum smart contract**\n7. **Results** are publicly visible on blockchain" },

  // Contact / support
  { tags: ["contact", "support", "help", "problem", "issue", "error", "kisi se baat", "email"],
    answer: "📞 **Need Help?**\n- Email admin: **admin@pollaris.com**\n- Make sure your account is verified before voting\n- Common issues: OTP in spam, face lighting, MetaMask not installed\n- For technical bugs, try refreshing the page or clearing browser cache" },
];

// ── Matcher ─────────────────────────────────────────────────────────────────
function findAnswer(input) {
  const q = input.toLowerCase().trim();
  if (!q) return null;

  // direct tag match (higher priority)
  for (const faq of FAQS) {
    if (faq.tags.some((t) => q.includes(t))) return faq.answer;
  }
  // word-level match
  const words = q.split(/\s+/);
  for (const faq of FAQS) {
    if (faq.tags.some((t) => words.some((w) => t.includes(w) && w.length > 3)))
      return faq.answer;
  }
  return null;
}

// ── Render markdown-ish text ─────────────────────────────────────────────────
function MsgText({ text }) {
  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {text.split("\n").map((line, i) => {
        // bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className={line.startsWith("- ") ? "pl-2" : ""}>
            {parts.map((p, j) =>
              j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p
            )}
          </p>
        );
      })}
    </div>
  );
}

// ── Quick suggestion chips ───────────────────────────────────────────────────
const SUGGESTIONS = [
  "How to vote?",
  "How to register?",
  "OTP not received",
  "Face scan help",
  "MetaMask setup",
  "View results",
];

// ── Main component ───────────────────────────────────────────────────────────
export default function PolarisBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "👋 Hi! I'm **PolarisBot** — your Pollaris voting assistant.\n\nAsk me anything about voting, registration, OTP, face scan, elections, or security!",
    },
  ]);
  const [input, setInput]   = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text: q }]);
    setTyping(true);

    setTimeout(() => {
      const ans = findAnswer(q);
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: ans ||
            "🤔 Sorry, I didn't understand that. Try asking about **voting**, **registration**, **OTP**, **face scan**, **MetaMask**, or **elections**.\n\nOr pick a topic below! 👇",
        },
      ]);
    }, 700);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            open
              ? "bg-slate-700 hover:bg-slate-600 text-white text-xl rotate-0"
              : "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-blue-500/40 hover:scale-110 active:scale-95 text-2xl"
          }`}
          title="PolarisBot — Ask me anything!"
        >
          {open ? "✕" : "💬"}
        </button>
      </div>

      {/* ── Chat Window ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[390px] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/60"
          style={{
            maxHeight: "560px",
            background: "linear-gradient(145deg, #0e1729 0%, #0b1120 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            animation: "chatUp .22s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {/* ── Header ── */}
          <div className="relative flex items-center gap-3 px-4 py-4 overflow-hidden flex-shrink-0">
            {/* bg glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/15 via-purple-600/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/40 via-purple-500/30 to-transparent" />

            {/* Bot avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
                🤖
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0e1729]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm">PolarisBot</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-medium">AI</span>
              </div>
              <p className="text-green-400 text-xs flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                Always online
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs border border-white/5"
            >✕</button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 items-end ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                {m.from === "bot" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0 mb-0.5 shadow-md shadow-blue-500/20">
                    🤖
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl max-w-[78%] text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-blue-500/20"
                      : "text-slate-300 rounded-bl-sm"
                  }`}
                  style={
                    m.from === "bot"
                      ? { background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.06)" }
                      : {}
                  }
                >
                  <MsgText text={m.text} />
                </div>
                {m.from === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-slate-700 flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
                    👤
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex gap-2 items-end justify-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center" style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Suggestion chips ── */}
          <div className="px-3 pt-2 pb-1.5 flex gap-1.5 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all whitespace-nowrap hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#93c5fd",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── Input ── */}
          <div className="px-3 py-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask me anything about Pollaris..."
              className="flex-1 text-sm placeholder-slate-600 text-white rounded-2xl px-4 py-2.5 focus:outline-none transition-all"
              style={{
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.2)")}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold transition-all disabled:opacity-25 hover:scale-105 active:scale-95 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}
