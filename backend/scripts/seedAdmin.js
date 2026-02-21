/**
 * seedAdmin.js
 * Run once to create the admin user:
 *   node backend/scripts/seedAdmin.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: "admin@blockvote.com" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    fullName: "BlockVote Admin",
    email: "admin@blockvote.com",
    phone: "9999999999",
    password: "Admin@1234",
    role: "admin",
    isVerified: true,
    photo: "default_admin.png",
  });

  console.log("✅ Admin created:");
  console.log("   Email   :", admin.email);
  console.log("   Password: Admin@1234");
  console.log("   Role    :", admin.role);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});
