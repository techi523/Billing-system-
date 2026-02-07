import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
            user?: any; // Already used in auth middleware
        }
    }
}
