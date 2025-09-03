import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { poisTable, usersTable } from '../db/schema';
import { type CreatePoiInput } from '../schema';
import { createPoi } from '../handlers/create_poi';
import { eq } from 'drizzle-orm';

// Test user data
const adminUser = {
  email: 'admin@test.com',
  password_hash: 'hashed_password',
  role: 'admin' as const
};

const regularUser = {
  email: 'user@test.com',
  password_hash: 'hashed_password',
  role: 'user' as const
};

// Test POI input
const testInput: CreatePoiInput = {
  name: 'Test Billboard',
  description: 'A test billboard location',
  latitude: 51.5074,
  longitude: -0.1278,
  poi_type: 'billboard',
  created_by: 1 // Will be set to actual admin user ID
};

describe('createPoi', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a POI when user is admin', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const input = {
      ...testInput,
      created_by: adminResult[0].id
    };

    const result = await createPoi(input);

    // Basic field validation
    expect(result.name).toEqual('Test Billboard');
    expect(result.description).toEqual(testInput.description);
    expect(result.latitude).toEqual(51.5074);
    expect(result.longitude).toEqual(-0.1278);
    expect(result.poi_type).toEqual('billboard');
    expect(result.created_by).toEqual(adminResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should save POI to database', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const input = {
      ...testInput,
      created_by: adminResult[0].id
    };

    const result = await createPoi(input);

    // Query database to verify POI was saved
    const pois = await db.select()
      .from(poisTable)
      .where(eq(poisTable.id, result.id))
      .execute();

    expect(pois).toHaveLength(1);
    expect(pois[0].name).toEqual('Test Billboard');
    expect(pois[0].description).toEqual(testInput.description);
    expect(parseFloat(pois[0].latitude)).toEqual(51.5074);
    expect(parseFloat(pois[0].longitude)).toEqual(-0.1278);
    expect(pois[0].poi_type).toEqual('billboard');
    expect(pois[0].created_at).toBeInstanceOf(Date);
    expect(pois[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject creation when user does not exist', async () => {
    const input = {
      ...testInput,
      created_by: 999 // Non-existent user ID
    };

    await expect(createPoi(input)).rejects.toThrow(/user not found/i);
  });

  it('should reject creation when user is not admin', async () => {
    // Create regular user first
    const userResult = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    const input = {
      ...testInput,
      created_by: userResult[0].id
    };

    await expect(createPoi(input)).rejects.toThrow(/only admin users can create pois/i);
  });

  it('should validate latitude bounds', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Test invalid latitude - too low
    const invalidLatLow = {
      ...testInput,
      created_by: adminResult[0].id,
      latitude: -91
    };

    await expect(createPoi(invalidLatLow)).rejects.toThrow(/latitude must be between -90 and 90/i);

    // Test invalid latitude - too high
    const invalidLatHigh = {
      ...testInput,
      created_by: adminResult[0].id,
      latitude: 91
    };

    await expect(createPoi(invalidLatHigh)).rejects.toThrow(/latitude must be between -90 and 90/i);
  });

  it('should validate longitude bounds', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Test invalid longitude - too low
    const invalidLonLow = {
      ...testInput,
      created_by: adminResult[0].id,
      longitude: -181
    };

    await expect(createPoi(invalidLonLow)).rejects.toThrow(/longitude must be between -180 and 180/i);

    // Test invalid longitude - too high
    const invalidLonHigh = {
      ...testInput,
      created_by: adminResult[0].id,
      longitude: 181
    };

    await expect(createPoi(invalidLonHigh)).rejects.toThrow(/longitude must be between -180 and 180/i);
  });

  it('should accept valid edge case coordinates', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Test valid edge cases
    const edgeCaseInput = {
      ...testInput,
      created_by: adminResult[0].id,
      latitude: -90, // Minimum valid latitude
      longitude: 180, // Maximum valid longitude
      name: 'Edge Case POI'
    };

    const result = await createPoi(edgeCaseInput);

    expect(result.latitude).toEqual(-90);
    expect(result.longitude).toEqual(180);
    expect(result.name).toEqual('Edge Case POI');
  });

  it('should handle different POI types', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Test wall type
    const wallInput = {
      ...testInput,
      created_by: adminResult[0].id,
      poi_type: 'wall' as const,
      name: 'Test Wall'
    };

    const wallResult = await createPoi(wallInput);
    expect(wallResult.poi_type).toEqual('wall');

    // Test other type
    const otherInput = {
      ...testInput,
      created_by: adminResult[0].id,
      poi_type: 'other' as const,
      name: 'Test Other'
    };

    const otherResult = await createPoi(otherInput);
    expect(otherResult.poi_type).toEqual('other');
  });

  it('should handle null description', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const input = {
      ...testInput,
      created_by: adminResult[0].id,
      description: null
    };

    const result = await createPoi(input);
    expect(result.description).toBeNull();
  });
});