import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { JwtPayload, UserRole } from "../types";

// Extend Express's Request type so `req.user` is typed everywhere it's used.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or malformed Authorization header" } });
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}

/**
 * Role-gating middleware, used after requireAuth on routes that only one
 * role should reach — e.g. only drivers can POST /driver/online, only
 * riders can POST /rides.
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: `This action requires the '${role}' role` } });
    }
    next();
  };
}
