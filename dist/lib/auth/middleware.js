"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_1 = require("./jwt");
const users_1 = require("./users");
async function requireAuth(req, res) {
    var _a;
    const token = (0, jwt_1.extractTokenFromHeader)((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization);
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return null;
    }
    const payload = (0, jwt_1.verifyToken)(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return null;
    }
    // Verify user still exists
    const user = (0, users_1.findUserById)(payload.userId);
    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return null;
    }
    return payload;
}
