// Production session debugging and fixes
import { Request, Response, NextFunction } from 'express';

export function addProductionSessionDebugging(app: any) {
  // Add middleware to debug session issues in production
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[PRODUCTION SESSION DEBUG] ${req.method} ${req.path}`);
      console.log(`[PRODUCTION SESSION DEBUG] Session ID: ${req.sessionID}`);
      console.log(`[PRODUCTION SESSION DEBUG] Authenticated: ${req.isAuthenticated()}`);
      console.log(`[PRODUCTION SESSION DEBUG] User: ${req.user?.username || 'NONE'}`);
      console.log(`[PRODUCTION SESSION DEBUG] Cookie Header: ${req.headers.cookie ? 'EXISTS' : 'MISSING'}`);
      
      // Set proper CORS headers for production
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    next();
  });
}

export function addProductionAuthTest(app: any) {
  // Production-specific auth test endpoint
  app.get('/api/production-auth-test', (req: Request, res: Response) => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id || null,
      username: req.user?.username || null,
      sessionId: req.sessionID,
      sessionExists: !!req.session,
      cookieHeader: req.headers.cookie ? 'EXISTS' : 'MISSING',
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      }
    };
    
    console.log('[PRODUCTION AUTH TEST]', debugInfo);
    res.json(debugInfo);
  });
}