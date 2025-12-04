"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.verifyPassword = verifyPassword;
exports.updateLastLogin = updateLastLogin;
exports.sanitizeUser = sanitizeUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const supabase_1 = require("./supabase");
const SALT_ROUNDS = 10;
async function createUser(email, password, name) {
    // Check if user already exists
    const { data: existingUser } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (existingUser) {
        throw new Error('User already exists');
    }
    // Hash password
    const hashedPassword = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    // Create user
    const user = {
        id: (0, uuid_1.v4)(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        created_at: new Date().toISOString()
    };
    const { error } = await supabase_1.supabase
        .from('users')
        .insert([user]);
    if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }
    return user;
}
async function findUserByEmail(email) {
    const { data, error } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
async function findUserById(id) {
    const { data, error } = await supabase_1.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
async function verifyPassword(plainPassword, hashedPassword) {
    return bcryptjs_1.default.compare(plainPassword, hashedPassword);
}
async function updateLastLogin(userId) {
    await supabase_1.supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
}
function sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
}
