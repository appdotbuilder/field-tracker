import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Helper function to create password hash (using same method as handler)
const createPasswordHash = async (password: string): Promise<string> => {
  const crypto = await import('node:crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid user credentials', async () => {
    // Create test user with hashed password
    const password = 'testpassword123';
    const hashedPassword = await createPasswordHash(password);
    
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: password
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.role).toEqual('user');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.password_hash).toEqual(hashedPassword);
  });

  it('should authenticate admin user correctly', async () => {
    // Create admin user
    const password = 'adminpass456';
    const hashedPassword = await createPasswordHash(password);
    
    await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin'
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'admin@example.com',
      password: password
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('admin@example.com');
    expect(result!.role).toEqual('admin');
    expect(result!.id).toBeDefined();
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test user
    const correctPassword = 'correctpassword';
    const hashedPassword = await createPasswordHash(correctPassword);
    
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should handle case-sensitive email matching', async () => {
    // Create user with lowercase email
    const password = 'testpassword';
    const hashedPassword = await createPasswordHash(password);
    
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .execute();

    // Try to login with different case email
    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: password
    };

    const result = await login(loginInput);

    // Should return null because emails don't match exactly
    expect(result).toBeNull();
  });

  it('should handle empty password', async () => {
    // Create test user
    const password = 'testpassword';
    const hashedPassword = await createPasswordHash(password);
    
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: ''
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should work with different valid email formats', async () => {
    const testCases = [
      'user@domain.com',
      'user.name@domain.com',
      'user+tag@domain.com',
      'user123@domain-name.com'
    ];

    const password = 'testpass123';
    const hashedPassword = await createPasswordHash(password);

    // Create users for each test case
    for (let i = 0; i < testCases.length; i++) {
      await db.insert(usersTable)
        .values({
          email: testCases[i],
          password_hash: hashedPassword,
          role: 'user'
        })
        .execute();
    }

    // Test login for each user
    for (const email of testCases) {
      const loginInput: LoginInput = {
        email: email,
        password: password
      };

      const result = await login(loginInput);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual(email);
      expect(result!.role).toEqual('user');
    }
  });

  it('should handle special characters in password', async () => {
    // Create user with complex password containing special characters
    const password = 'Test@Pass#123!$%^&*()';
    const hashedPassword = await createPasswordHash(password);
    
    await db.insert(usersTable)
      .values({
        email: 'special@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'special@example.com',
      password: password
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('special@example.com');
    expect(result!.role).toEqual('user');
  });
});