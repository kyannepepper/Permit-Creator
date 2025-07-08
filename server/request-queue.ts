import { Request, Response, NextFunction } from 'express';

// Request queue system for handling server warmup and high load
interface QueuedRequest {
  id: string;
  req: Request;
  res: Response;
  next: NextFunction;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxQueueSize = 100;
  private requestTimeout = 30000; // 30 seconds
  private processInterval = 50; // Process every 50ms

  constructor() {
    // Start processing queue
    this.startProcessing();
  }

  private startProcessing() {
    setInterval(() => {
      this.processQueue();
    }, this.processInterval);
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Process requests in order
    const request = this.queue.shift();
    if (request) {
      console.log(`[REQUEST QUEUE] Processing request ${request.id}, queue size: ${this.queue.length}`);
      
      // Clear timeout
      clearTimeout(request.timeout);
      
      // Process the request
      try {
        request.next();
      } catch (error) {
        console.error(`[REQUEST QUEUE] Error processing request ${request.id}:`, error);
        if (!request.res.headersSent) {
          request.res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
    
    this.processing = false;
  }

  public addRequest(req: Request, res: Response, next: NextFunction): boolean {
    // Check if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      console.warn(`[REQUEST QUEUE] Queue full, rejecting request`);
      return false;
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set timeout for request
    const timeout = setTimeout(() => {
      console.warn(`[REQUEST QUEUE] Request ${requestId} timed out`);
      const index = this.queue.findIndex(r => r.id === requestId);
      if (index !== -1) {
        this.queue.splice(index, 1);
        if (!res.headersSent) {
          res.status(504).json({ error: 'Request timeout' });
        }
      }
    }, this.requestTimeout);

    // Add to queue
    this.queue.push({
      id: requestId,
      req,
      res,
      next,
      timestamp: Date.now(),
      timeout
    });

    console.log(`[REQUEST QUEUE] Added request ${requestId}, queue size: ${this.queue.length}`);
    return true;
  }

  public getQueueStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxQueueSize: this.maxQueueSize,
      oldestRequest: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
    };
  }
}

// Global request queue instance
const requestQueue = new RequestQueue();

// Middleware for request queuing during server warmup
export const requestQueueMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const uptime = process.uptime();
  
  // Only queue requests during server warmup (first 10 seconds) in production
  if (isProduction && uptime < 10) {
    console.log(`[REQUEST QUEUE] Queueing request during warmup (uptime: ${uptime}s)`);
    
    const queued = requestQueue.addRequest(req, res, next);
    if (!queued) {
      return res.status(503).json({ 
        error: 'Server overloaded, please try again later',
        retryAfter: 5
      });
    }
    
    // Don't call next() - request is queued
    return;
  }
  
  // Process immediately if not in warmup period
  next();
};

// Health check endpoint for queue status
export const getQueueStatus = () => {
  return requestQueue.getQueueStats();
};

export default requestQueue;