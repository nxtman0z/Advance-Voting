const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  candidateId: { type: Number, required: true }, // on-chain ID
  name: { type: String, required: true },
  party: { type: String, required: true },
  imageHash: { type: String }, // IPFS or URL
  bio: { type: String },
  voteCount: { type: Number, default: 0 }, // cached from blockchain
});

const electionSchema = new mongoose.Schema(
  {
    // ─── On-chain Reference ─────────────────────────────────────────────
    onChainId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    contractAddress: {
      type: String,
      trim: true,
    },
    deployTxHash: {
      type: String,
    },

    // ─── Election Info ──────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Election title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    electionType: {
      type: String,
      enum: ["general", "local", "organizational", "referendum"],
      default: "general",
    },

    // ─── Timing ─────────────────────────────────────────────────────────
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },

    // ─── Status ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "upcoming", "active", "ended", "cancelled"],
      default: "draft",
    },
    isBlockchainDeployed: {
      type: Boolean,
      default: false,
    },

    // ─── Candidates ─────────────────────────────────────────────────────
    candidates: [candidateSchema],

    // ─── Registered Voters ──────────────────────────────────────────────
    registeredVoters: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        walletAddress: { type: String },
        registeredAt: { type: Date, default: Date.now },
      },
    ],

    // ─── Results Cache ───────────────────────────────────────────────────
    totalVotes: { type: Number, default: 0 },
    resultsPublished: { type: Boolean, default: false },

    // ─── Admin ───────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual ────────────────────────────────────────────────────────────────
electionSchema.virtual("isActive").get(function () {
  const now = new Date();
  return this.status === "active" && this.startTime <= now && this.endTime >= now;
});

electionSchema.virtual("hasEnded").get(function () {
  return new Date() > this.endTime;
});

// ─── Auto-update status before queries ──────────────────────────────────────
electionSchema.pre(/^find/, function (next) {
  // status is managed by cron/admin; no auto-update in query hook
  next();
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
electionSchema.index({ status: 1 });
electionSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model("Election", electionSchema);
