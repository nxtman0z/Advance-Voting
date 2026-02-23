const nodemailer = require("nodemailer");
const twilio = require("twilio");

// ─── Email transporter (lazy init) ───────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log("✉️  Gmail SMTP transporter ready:", process.env.EMAIL_USER);
  return _transporter;
}

// ─── Twilio Client ────────────────────────────────────────────────────────────
let twilioClient = null;
const sid = process.env.TWILIO_ACCOUNT_SID || "";
if (sid.startsWith("AC") && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(sid, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("⚠️  Twilio init failed (SMS disabled):", e.message);
  }
} else {
  console.warn("⚠️  Twilio not configured — SMS OTP disabled. Set TWILIO_ACCOUNT_SID in .env");
}

// ─────────────────────────────────────────────
//  Main OTP sender
// ─────────────────────────────────────────────
/**
 * Send OTP via email and/or SMS
 * @param {string} email
 * @param {string} phone
 * @param {string} otp
 * @param {string} purpose  - "verification" | "voting"
 */
exports.sendOTP = async (email, phone, otp, purpose = "voting") => {
  const subject =
    purpose === "verification"
      ? "Verify Your Blockchain Voting Account"
      : "Your Voting OTP - Blockchain Voting System";

  const emailHtml = generateEmailTemplate(otp, purpose);

  console.log(`\n🔑 OTP generated for ${email}  (purpose: ${purpose})\n`);

  // ─── Send via Gmail ────────────────────────────────────────────────────
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"Pollaris" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: emailHtml,
  });
  console.log(`✉️  OTP email sent to ${email}  [${info.response}]`);

  // ─── SMS via Twilio (optional) ────────────────────────────────────────
  if (twilioClient && phone) {
    try {
      await twilioClient.messages.create({
        body: `Your Blockchain Voting OTP is: ${otp}. Valid for 10 minutes. Do not share it.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`📱 OTP SMS sent to ${phone}`);
    } catch (err) {
      console.error("❌ SMS OTP failed:", err.message);
    }
  }
};

// ─── Email Template ───────────────────────────────────────────────────────────
function generateEmailTemplate(otp, purpose) {
  const action = purpose === "verification" ? "verify your account" : "authorize your vote";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>OTP Verification</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .header span { color: #4fc3f7; }
        .body { padding: 30px; }
        .otp-box { background: #f0f7ff; border: 2px dashed #4fc3f7; border-radius: 8px; text-align: center; padding: 20px; margin: 20px 0; }
        .otp { font-size: 38px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e; }
        .footer { background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔗 Blockchain <span>Voting</span></h1>
        </div>
        <div class="body">
          <p>Hello,</p>
          <p>Use the OTP below to <strong>${action}</strong>. This code is valid for <strong>10 minutes</strong>.</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p style="color: #e53935;">⚠️ Never share this OTP with anyone. Our team will never ask for it.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Blockchain Voting System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
