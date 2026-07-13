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
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 5,
    parts: 10,
    fieldNameSize: 100,
  }, // 5MB, max 5 files
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, and AVIF images are allowed');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

// ─── Upload buffer to Cloudinary ──────────────────────────────────────────────
async function uploadToCloudinary(buffer, options = {}) {
  const { folder = 'reclaim/items', publicId } = options;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        ...(publicId
          ? { public_id: publicId, overwrite: false, unique_filename: false }
          : { folder }),
        resource_type: 'image',
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
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return ['ok', 'not found'].includes(result?.result);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return false;
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
