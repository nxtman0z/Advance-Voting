const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTP } = require("../utils/otpUtils");

// ─── Helper: Generate JWT ─────────────────────────────────────────────────────
// Admin tokens expire in 8h; voter tokens expire in 1d for tighter security
const generateToken = (userId, role, tokenVersion = 0) => {
  const expiry = role === "admin" ? "8h" : "1d";
  return jwt.sign({ id: userId, role, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: expiry,
  });
};

const cookieOptions = (role) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: role === "admin" ? 8 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new voter
// @access  Public
// ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password, gender, voterId } = req.body;
    const photoFile = req.file; // from multer

    if (!fullName || !email || !phone || !password || !gender || !voterId) {
      return res.status(400).json({ success: false, message: "All fields are required (fullName, email, phone, password, gender, voterId)" });
    }
    if (!photoFile) {
      return res.status(400).json({ success: false, message: "Profile photo is required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (!["male", "female", "other"].includes(gender.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Gender must be male, female, or other" });
    }

    // Check duplicates
    const existing = await User.findOne({
      $or: [{ email }, { phone }, { voterId: voterId.toUpperCase() }],
    });
    if (existing) {
      let msg = "A user with this email or phone already exists";
      if (existing.voterId === voterId.toUpperCase()) msg = "This Voter ID is already registered";
      return res.status(400).json({ success: false, message: msg });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      gender: gender.toLowerCase(),
      voterId: voterId.toUpperCase(),
      role: "voter",   // always voter — admin is seeded separately
      isVerified: true,
      photo: photoFile.filename,
    });

    const token = generateToken(user._id, user.role, user.tokenVersion);
    res.cookie("token", token, cookieOptions(user.role));

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        voterId: user.voterId,
        role: user.role,
        isVerified: user.isVerified,
        photo: user.photo,
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

    const emailClean    = email.toLowerCase().trim();
    const passwordClean = password.trim();

    const user = await User.findOne({ email: emailClean }).select("+password");
    console.log("[LOGIN DEBUG] email:", emailClean, "| user found:", !!user);
    if (user) {
      const match = await user.comparePassword(passwordClean);
      console.log("[LOGIN DEBUG] password match:", match);
      if (!match) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
    } else {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role, user.tokenVersion);
    res.cookie("token", token, cookieOptions(user.role));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        voterId: user.voterId,
        photo: user.photo,
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
// @route   POST /api/auth/admin-wallet-login
// @desc    Admin login via MetaMask wallet signature
// @access  Public
// ─────────────────────────────────────────────
exports.adminWalletLogin = async (req, res) => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({ success: false, message: "address, signature and message are required" });
    }

    // Recover signer from signature
    const { ethers } = require("ethers");
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ success: false, message: "Signature verification failed" });
    }

    // Check against admin wallet from .env
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    if (!adminWallet) {
      return res.status(500).json({ success: false, message: "Admin wallet not configured on server" });
    }

    if (recoveredAddress.toLowerCase() !== adminWallet.toLowerCase()) {
      return res.status(403).json({ success: false, message: "This wallet is not authorized as admin" });
    }

    // Find admin user in DB
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin account not found. Run seed script." });
    }

    const token = generateToken(admin._id, "admin", admin.tokenVersion);
    res.cookie("token", token, cookieOptions("admin"));

    res.status(200).json({
      success: true,
      message: "Admin wallet verified. Welcome!",
      data: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: "admin",
        walletAddress: recoveredAddress,
      },
      token,
    });
  } catch (error) {
    console.error("adminWalletLogin error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
// ─────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    // Increment tokenVersion → instantly invalidates ALL active tokens for this user
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
  } catch (_) {
    // Non-critical — still proceed with logout
  }
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
// @route   POST /api/auth/verify-face
// @desc    Verify submitted face descriptor against stored one
// @access  Private
// ─────────────────────────────────────────────
exports.verifyFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ success: false, message: "Face descriptor is required" });
    }

    const user = await User.findById(req.user.id).select("+faceDescriptor");
    if (!user || !user.faceDescriptor || user.faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: "No registered face found. Please register your face first." });
    }

    // Euclidean distance
    const stored = user.faceDescriptor;
    const incoming = faceDescriptor;
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(stored[i] - incoming[i], 2);
    }
    const distance = Math.sqrt(sum);
    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.5;

    if (distance > threshold) {
      return res.status(401).json({
        success: false,
        message: "Face verification failed. Please try again.",
        distance,
      });
    }

    res.status(200).json({ success: true, message: "Face verified successfully", distance });
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

// ─────────────────────────────────────────────
// @route   PATCH /api/auth/update-profile
// @desc    Update optional profile fields (photo, address, dob, bio, social)
// @access  Private
// ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { address, dateOfBirth, bio, twitterHandle, linkedinUrl } = req.body;

    const updates = {};
    if (address     !== undefined) updates.address               = address;
    if (dateOfBirth !== undefined && dateOfBirth !== "") updates.dateOfBirth = new Date(dateOfBirth);
    if (bio         !== undefined) updates.bio                   = bio;
    if (twitterHandle !== undefined) updates["socialLinks.twitter"] = twitterHandle;
    if (linkedinUrl   !== undefined) updates["socialLinks.linkedin"] = linkedinUrl;

    if (req.file) updates.photo = req.file.filename;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: "Nothing to update" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
