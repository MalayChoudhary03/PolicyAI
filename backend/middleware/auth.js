/**
 * Administrator Authorization Middleware
 * 
 * Verifies admin requests via 'x-admin-key' header.
 * Default admin key is 'admin-secret' if ADMIN_API_KEY environment variable is not set.
 */
export const requireAdmin = (req, res, next) => {
  const expectedKey = (process.env.ADMIN_API_KEY || 'admin-secret').trim();
  const providedKey = String(req.headers['x-admin-key'] || req.query.adminKey || '').trim();

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Valid Administrator Password is required to manage policy documents.'
    });
  }

  next();
};
