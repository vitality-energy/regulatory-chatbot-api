/**
 * Middleware helper to extract request information
 */
export const extractRequestInfo = (req: any) => {
  return {
    userAgent: req.get('User-Agent') || undefined,
    ipAddress: req.ip || req.connection?.remoteAddress || undefined,
    sessionId: req.session?.id || undefined,
    userId: req.user?.id || undefined,
  };
};

/**
 * Calculate request/response sizes
 */
export const calculatePayloadSize = (payload: any): number => {
  if (!payload) return 0;
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}; 