import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

const SALT_ROUNDS = 10;

export interface User {
    id: string;
    email: string;
    password: string; // hashed
    name: string;
    created_at: string;
    last_login?: string;
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle(); // Use maybeSingle() to avoid error when no user exists

    if (existingUser) {
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

export async function findUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows

    if (error) {
        console.error('Error finding user by email:', error);
        return null;
    }

    return data as User | null;
}

export async function findUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single()

    if (error) {
        console.error('Error finding user by id:', error);
        return null;
    }

    return data as User | null;
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

export async function updateLastLogin(userId: string): Promise<void> {
    await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
}
