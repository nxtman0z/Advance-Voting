const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ─── Personal Info ──────────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    nationalId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    voterId: {
      type: String,
      required: [true, "Voter ID is required"],
      unique: true,
      sparse: false,
      trim: true,
      uppercase: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    address: {
      type: String,
      trim: true,
    },

    // ─── Authentication ─────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 4,
      select: false,
    },
    role: {
      type: String,
      enum: ["voter", "admin"],
      default: "voter",
    },

    // ─── Blockchain / Wallet ────────────────────────────────────────────
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // ─── Face Recognition ───────────────────────────────────────────────
    faceDescriptor: {
      type: [Number], // 128-dimensional face embedding from face-api.js
      default: undefined,
    },
    faceImagePath: {
      type: String,
      default: null,
    },
    photo: {
      type: String, // stored filename
      default: null,
    },
    isFaceRegistered: {
      type: Boolean,
      default: false,
    },

    // ─── OTP ────────────────────────────────────────────────────────────
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },

    // ─── Account Status ─────────────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlockedFromVoting: {
      type: Boolean,
      default: false,
    },

    // ─── Voting History ─────────────────────────────────────────────────
    votedElections: [
      {
        electionId: { type: Number },
        votedAt: { type: Date, default: Date.now },
        txHash: { type: String },
      },
    ],

    // ─── Password Reset ─────────────────────────────────────────────────
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    lastLogin: { type: Date },

    // ─── Token Invalidation ──────────────────────────────────────────────
    // Incremented on logout → all previously issued tokens become invalid immediately
    tokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual ────────────────────────────────────────────────────────────────
userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// ─── Pre-save Hook ───────────────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasVotedInElection = function (electionId) {
  return this.votedElections.some((v) => v.electionId === electionId);
};

// ─── Indexes (additional compound/search indexes only) ─────────────────────
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, isVerified: 1 });

module.exports = mongoose.model("User", userSchema);
