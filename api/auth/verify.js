const { verifyToken, extractTokenFromHeader } = require('../../dist/lib/auth/jwt.js');
const { findUserById, sanitizeUser } = require('../../dist/lib/auth/users.js');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Verify user still exists
        const user = findUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: sanitizeUser(user)
        });

    } catch (error) {
        console.error('Verify error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
