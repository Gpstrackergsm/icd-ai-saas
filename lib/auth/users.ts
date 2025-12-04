import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const SALT_ROUNDS = 10;

export interface User {
    id: string;
    email: string;
    password: string; // hashed
    name: string;
    createdAt: string;
    lastLogin?: string;
}

interface UsersData {
    users: User[];
}

function readUsers(): UsersData {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return { users: [] };
        }
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [] };
    }
}

function writeUsers(data: UsersData): void {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
    const data = readUsers();

    // Check if user already exists
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user: User = {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        createdAt: new Date().toISOString()
    };

    data.users.push(user);
    writeUsers(data);

    return user;
}

export function findUserByEmail(email: string): User | null {
    const data = readUsers();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserById(id: string): User | null {
    const data = readUsers();
    return data.users.find(u => u.id === id) || null;
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

export function updateLastLogin(userId: string): void {
    const data = readUsers();
    const user = data.users.find(u => u.id === userId);
    if (user) {
        user.lastLogin = new Date().toISOString();
        writeUsers(data);
    }
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
}
