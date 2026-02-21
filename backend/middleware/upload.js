const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─── Ensure upload directories exist ─────────────────────────────────────────
const dirs = {
  photos: path.join(__dirname, "../uploads/photos"),
  parties: path.join(__dirname, "../uploads/parties"),
};
Object.values(dirs).forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

// ─── Storage: voter profile photos ───────────────────────────────────────────
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dirs.photos),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}${ext}`);
  },
});

// ─── Storage: party images (symbol, partyImage, candidatePhoto) ───────────────
const partyStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dirs.parties),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  },
});

// ─── Exports ──────────────────────────────────────────────────────────────────
const upload = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadParty = multer({
  storage: partyStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "partySymbol", maxCount: 1 },
  { name: "partyImage", maxCount: 1 },
  { name: "candidatePhoto", maxCount: 1 },
]);

module.exports = { upload, uploadParty };
