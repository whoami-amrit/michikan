// src/types/express.d.ts
import { IJwtAccessPayload } from './jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: IJwtAccessPayload;
    }
  }
}
