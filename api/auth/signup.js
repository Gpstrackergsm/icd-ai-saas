const { createUser, sanitizeUser } = require('../../dist/lib/auth/users.js');
const { generateToken } = require('../../dist/lib/auth/jwt.js');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Create user
        const user = await createUser(email, password, name);

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email
        });

        // Return success
        return res.status(201).json({
            success: true,
            token,
            user: sanitizeUser(user)
        });

    } catch (error) {
        if (error.message === 'User already exists') {
            return res.status(409).json({ error: 'User already exists' });
        }

        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
