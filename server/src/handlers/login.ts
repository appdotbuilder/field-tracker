import { eq } from 'drizzle-orm';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';

export const login = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // For this implementation, we'll use a simple hash comparison
    // In a real application, you'd use bcrypt or similar
    const crypto = await import('node:crypto');
    const inputHash = crypto.createHash('sha256').update(input.password).digest('hex');
    
    if (inputHash !== user.password_hash) {
      return null; // Invalid password
    }

    // Return user data
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};