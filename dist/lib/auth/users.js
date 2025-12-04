"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
// Use /tmp directory on Vercel (serverless functions have read-only file system)
const isVercel = process.env.VERCEL === '1';
const USERS_FILE = isVercel
    ? '/tmp/users.json'
    : path.join(process.cwd(), 'data', 'users.json');
const SALT_ROUNDS = 10;
function readUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return { users: [] };
        }
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        return { users: [] };
    }
}
function writeUsers(data) {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}
async function createUser(email, password, name) {
    const data = readUsers();
    // Check if user already exists
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
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
        createdAt: new Date().toISOString()
    };
    data.users.push(user);
    writeUsers(data);
    return user;
}
function findUserByEmail(email) {
    const data = readUsers();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}
function findUserById(id) {
    const data = readUsers();
    return data.users.find(u => u.id === id) || null;
}
async function verifyPassword(plainPassword, hashedPassword) {
    return bcryptjs_1.default.compare(plainPassword, hashedPassword);
}
function updateLastLogin(userId) {
    const data = readUsers();
    const user = data.users.find(u => u.id === userId);
    if (user) {
        user.lastLogin = new Date().toISOString();
        writeUsers(data);
    }
}
function sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
}
