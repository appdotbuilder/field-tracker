import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = input.email.toLowerCase();
    
    // Check if user with this email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    // Hash the password using scrypt
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(input.password, salt, 64) as Buffer;
    const password_hash = `${salt}:${derivedKey.toString('hex')}`;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: normalizedEmail,
        password_hash,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};