// src/types/express.d.ts
import { IJwtPayload } from './jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}
