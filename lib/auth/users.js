const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('./supabase');

const SALT_ROUNDS = 10;

async function createUser(email, password, name) {
    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (existingUser) {
        throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('users')
        .insert([user]);

    if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }

    return user;
}

async function findUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (error) {
        console.error('Error finding user by email:', error);
        return null;
    }

    return data;
}

async function findUserById(id) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error finding user by id:', error);
        return null;
    }

    return data;
}

async function verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

async function updateLastLogin(userId) {
    await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
}

function sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    verifyPassword,
    updateLastLogin,
    sanitizeUser
};
