const { findUserByEmail, verifyPassword, updateLastLogin, sanitizeUser } = require('../../dist/lib/auth/users.js');
const { generateToken } = require('../../dist/lib/auth/jwt.js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        updateLastLogin(user.id);

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email
        });

        // Return success
        return res.status(200).json({
            success: true,
            token,
            user: sanitizeUser(user)
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
