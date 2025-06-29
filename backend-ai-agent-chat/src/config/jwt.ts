export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️ Using development JWT secret. Set JWT_SECRET environment variable for production.');
  return "dev-jwt-secret-kNFNj0uQCVzdBoVKAbAKUUTf0JPtYqlD";
})(); 