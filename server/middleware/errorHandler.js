// server/middleware/errorHandler.js

export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.'
    });
  }

  // Modal API errors
  if (err.isModalError) {
    return res.status(502).json({
      success: false,
      error: 'Failed to generate 3D model. Please try again.',
      details: err.message
    });
  }

  // Generic error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};