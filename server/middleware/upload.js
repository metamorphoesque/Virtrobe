// server/middleware/upload.js
import multer from 'multer';
import config from '../config/index.js';

// Memory storage (don't save to disk)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize
  }
});

export default upload;