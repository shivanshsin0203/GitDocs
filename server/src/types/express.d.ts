import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};