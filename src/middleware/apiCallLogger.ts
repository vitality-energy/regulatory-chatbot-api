import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiCallService } from '../services';
import { calculatePayloadSize } from '../utils/helpers';

export const apiCallLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture the response JSON
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log and save to database when response finishes
  res.on("finish", async () => {
    const duration = Date.now() - start;
    
    if (path.startsWith("/api")) {
      // Create log line
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.info(logLine);

      // Save to database (without user-specific fields)
      try {
        const apiCallData = {
          endpoint: path,
          method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip || undefined,
          requestPayload: req.body || undefined,
          responsePayload: capturedJsonResponse || undefined,
          requestSize: calculatePayloadSize(req.body),
          responseSize: calculatePayloadSize(capturedJsonResponse),
          duration,
          statusCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 400,
          timestamp: new Date(),
        };

        await ApiCallService.logApiCall(apiCallData);
      } catch (error) {
        logger.error('Failed to log API call to database:', error);
      }
    }
  });

  next();
}; 