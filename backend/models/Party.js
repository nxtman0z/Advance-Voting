const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    // ─── Election Reference ──────────────────────────────────────────────
    election: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    onChainElectionId: { type: Number, required: true },
    onChainCandidateId: { type: Number, default: null }, // set after blockchain add

    // ─── Party Details ───────────────────────────────────────────────────
    partyName: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
    },
    partySymbol: {
      type: String, // uploaded filename of symbol image
      required: [true, "Party symbol image is required"],
    },
    partyImage: {
      type: String, // optional banner image
      default: null,
    },

    // ─── Candidate ───────────────────────────────────────────────────────
    candidateName: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
    },
    candidateBio: {
      type: String,
      trim: true,
      default: "",
    },
    candidatePhoto: {
      type: String, // uploaded filename
      default: null,
    },

    // ─── Voting Stats ────────────────────────────────────────────────────
    voteCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

partySchema.index({ election: 1 });
partySchema.index({ onChainElectionId: 1 });

module.exports = mongoose.model("Party", partySchema);
