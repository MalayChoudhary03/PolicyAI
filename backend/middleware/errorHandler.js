/**
 * Central Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const status = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const message = err.message || 'An internal server error occurred';

  res.status(status).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
