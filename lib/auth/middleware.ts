import { verifyToken, extractTokenFromHeader } from './jwt';
import { findUserById } from './users';

export interface AuthRequest {
    method?: string;
    headers?: {
        authorization?: string;
    };
}

export interface AuthResponse {
    status: (code: number) => AuthResponse;
    json: (data: any) => void;
}

export async function requireAuth(req: AuthRequest, res: AuthResponse): Promise<{ userId: string; email: string } | null> {
    const token = extractTokenFromHeader(req.headers?.authorization);

    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return null;
    }

    const payload = verifyToken(token);

    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return null;
    }

    // Verify user still exists
    const user = findUserById(payload.userId);
    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return null;
    }

    return payload;
}
