const User = require("../models/User");
const crypto = require("crypto");
const { sendOTP } = require("../utils/otpUtils");

// ─────────────────────────────────────────────
// @route   POST /api/otp/send
// @desc    Send OTP to user's email/phone
// @access  Private
// ─────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Cool-down: prevent spamming (1 OTP per 60 seconds)
    // otpExpires = createdAt + 10 min → was created in last 60s if otpExpires > now + 9 min
    if (user.otpExpires && user.otpExpires > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting a new OTP",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    user.otp = otpHash;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.otpVerified = false;
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTP(user.email, user.phone, otp, "voting");
    } catch (emailErr) {
      console.error("sendOtp email error:", emailErr.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please contact admin.",
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to ${user.email}`,
    });
  } catch (error) {
    console.error("sendOtp error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/otp/verify
// @desc    Verify the submitted OTP before voting
// @access  Private
// ─────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      _id: req.user.id,
      otp: otpHash,
      otpExpires: { $gt: Date.now() },
    }).select("+otp +otpExpires");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark OTP as verified
    user.otpVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: { otpVerified: true },
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/otp/status
// @desc    Check if OTP is verified for the current session
// @access  Private
// ─────────────────────────────────────────────
exports.getOtpStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("otpVerified otpExpires");
    res.status(200).json({
      success: true,
      data: {
        otpVerified: user.otpVerified,
        hasActiveOtp: user.otpExpires && user.otpExpires > new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
