const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Multer memory storage (then upload to Cloudinary manually) ───────────────
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB, max 5 files
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// ─── Upload buffer to Cloudinary ──────────────────────────────────────────────
async function uploadToCloudinary(buffer, folder = 'reclaim/items') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    ).end(buffer);
  });
}

// ─── Delete from Cloudinary ───────────────────────────────────────────────────
async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
}

// ─── Upload avatar ────────────────────────────────────────────────────────────
async function uploadAvatar(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'reclaim/avatars',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    ).end(buffer);
  });
}

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary, uploadAvatar };
