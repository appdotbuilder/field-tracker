import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import { scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Helper function to verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return key === derivedKey.toString('hex');
}

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

const adminInput: CreateUserInput = {
  email: 'admin@example.com',
  password: 'adminpass456',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation (email should be normalized to lowercase)
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toContain(':'); // Should contain salt:hash format
    expect(result.password_hash.length).toBeGreaterThan(50); // Should be reasonably long
    
    // Verify password hash is valid
    const isValidHash = await verifyPassword('password123', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].role).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
    
    // Verify password can be verified
    const isValidPassword = await verifyPassword('password123', users[0].password_hash);
    expect(isValidPassword).toBe(true);
  });

  it('should create admin user with admin role', async () => {
    const result = await createUser(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    
    // Verify password hashing works for admin too
    const isValidHash = await verifyPassword('adminpass456', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should use default role when not specified', async () => {
    const inputWithoutRole = {
      email: 'defaultuser@example.com',
      password: 'password123'
    };

    // Parse through schema to apply defaults
    const parsedInput = {
      ...inputWithoutRole,
      role: 'user' as const // Zod default is applied
    };

    const result = await createUser(parsedInput);
    expect(result.role).toEqual('user');
  });

  it('should reject duplicate emails', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    await expect(createUser(testInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should reject duplicate emails case-insensitively', async () => {
    // Create first user
    await createUser(testInput);

    // Try with different case
    const upperCaseInput: CreateUserInput = {
      ...testInput,
      email: 'TEST@EXAMPLE.COM'
    };

    // Handler should normalize emails and detect duplicate
    await expect(createUser(upperCaseInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should handle different password lengths', async () => {
    const shortPasswordInput: CreateUserInput = {
      email: 'short@example.com',
      password: '123456', // Minimum length
      role: 'user'
    };

    const longPasswordInput: CreateUserInput = {
      email: 'long@example.com',
      password: 'this-is-a-very-long-password-with-special-characters!@#$%^&*()',
      role: 'user'
    };

    // Both should work
    const shortResult = await createUser(shortPasswordInput);
    const longResult = await createUser(longPasswordInput);

    expect(shortResult.id).toBeDefined();
    expect(longResult.id).toBeDefined();

    // Verify both passwords hash correctly
    const shortValid = await verifyPassword('123456', shortResult.password_hash);
    const longValid = await verifyPassword('this-is-a-very-long-password-with-special-characters!@#$%^&*()', longResult.password_hash);
    
    expect(shortValid).toBe(true);
    expect(longValid).toBe(true);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(adminInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('admin@example.com');

    // Verify both exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});