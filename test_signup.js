const { createUser } = require('./dist/lib/auth/users.js');
const { generateToken } = require('./dist/lib/auth/jwt.js');

async function testSignup() {
    try {
        console.log('Testing signup...');

        const user = await createUser('test@example.com', 'password123', 'Test User');
        console.log('User created:', user);

        const token = generateToken({ userId: user.id, email: user.email });
        console.log('Token generated:', token);

        console.log('✅ Signup test passed!');
    } catch (error) {
        console.error('❌ Signup test failed:', error.message);
        console.error(error.stack);
    }
}

testSignup();
