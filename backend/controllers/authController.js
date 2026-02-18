const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTP } = require("../utils/otpUtils");

// ─── Helper: Generate JWT ─────────────────────────────────────────────────────
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new voter
// @access  Public
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, nationalId, dateOfBirth, password, walletAddress } = req.body;

    // Check duplicates
    const existing = await User.findOne({
      $or: [{ email }, { phone }, { nationalId }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A user with this email, phone, or national ID already exists",
      });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      nationalId,
      dateOfBirth,
      password,
      walletAddress: walletAddress ? walletAddress.toLowerCase() : undefined,
    });

    // Send OTP for email/phone verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    user.otp = otpHash;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    await sendOTP(user.email, user.phone, otp, "verification");

    const token = generateToken(user._id, user.role);
    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your account with the OTP sent.",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);
    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isFaceRegistered: user.isFaceRegistered,
        walletAddress: user.walletAddress,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
// ─────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie("token", "loggedout", {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000),
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
// ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-faceDescriptor");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @desc    Verify email/phone OTP
// @access  Private
// ─────────────────────────────────────────────
exports.verifyAccount = async (req, res) => {
  try {
    const { otp } = req.body;
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      _id: req.user.id,
      otp: otpHash,
      otpExpires: { $gt: Date.now() },
    }).select("+otp +otpExpires");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otpVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PATCH /api/auth/update-wallet
// @desc    Update user wallet address
// @access  Private
// ─────────────────────────────────────────────
exports.updateWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: "Wallet address is required" });
    }

    const existing = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: req.user.id },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Wallet already linked to another account" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { walletAddress: walletAddress.toLowerCase() },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
