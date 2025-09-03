import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable } from '../db/schema';
import { type UpdateZoneInput, type CreateUserInput } from '../schema';
import { updateZone } from '../handlers/update_zone';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'admin'
};

const validGeoJSON = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [-74.0059, 40.7128],
    [-74.0059, 40.7628],
    [-73.9559, 40.7628],
    [-73.9559, 40.7128],
    [-74.0059, 40.7128]
  ]]
});

describe('updateZone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a zone with all fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Original Zone',
        description: 'Original description',
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Update all fields
    const updateInput: UpdateZoneInput = {
      id: zone.id,
      name: 'Updated Zone',
      description: 'Updated description',
      geometry: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [-75.0059, 41.7128],
          [-75.0059, 41.7628],
          [-74.9559, 41.7628],
          [-74.9559, 41.7128],
          [-75.0059, 41.7128]
        ]]
      }),
      estimated_houses: 200
    };

    const result = await updateZone(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(zone.id);
    expect(result.name).toEqual('Updated Zone');
    expect(result.description).toEqual('Updated description');
    expect(result.geometry).toEqual(updateInput.geometry!);
    expect(result.estimated_houses).toEqual(200);
    expect(result.created_by).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(zone.updated_at.getTime());
  });

  it('should update only provided fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Original Zone',
        description: 'Original description',
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Update only name and estimated_houses
    const updateInput: UpdateZoneInput = {
      id: zone.id,
      name: 'Updated Zone Name',
      estimated_houses: 150
    };

    const result = await updateZone(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Updated Zone Name');
    expect(result.estimated_houses).toEqual(150);
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.geometry).toEqual(validGeoJSON); // Unchanged
    expect(result.updated_at.getTime()).toBeGreaterThan(zone.updated_at.getTime());
  });

  it('should update description to null', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone with description
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'Has description',
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Update description to null
    const updateInput: UpdateZoneInput = {
      id: zone.id,
      description: null
    };

    const result = await updateZone(updateInput);

    expect(result.description).toBeNull();
  });

  it('should save updated zone to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Original Zone',
        description: 'Original description',
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Update zone
    const updateInput: UpdateZoneInput = {
      id: zone.id,
      name: 'Database Updated Zone'
    };

    await updateZone(updateInput);

    // Verify changes were saved to database
    const zones = await db.select()
      .from(zonesTable)
      .where(eq(zonesTable.id, zone.id))
      .execute();

    expect(zones).toHaveLength(1);
    expect(zones[0].name).toEqual('Database Updated Zone');
    expect(zones[0].updated_at.getTime()).toBeGreaterThan(zone.updated_at.getTime());
  });

  it('should throw error for non-existent zone', async () => {
    const updateInput: UpdateZoneInput = {
      id: 99999,
      name: 'Updated Zone'
    };

    await expect(updateZone(updateInput)).rejects.toThrow(/Zone with id 99999 not found/i);
  });

  it('should throw error for invalid GeoJSON format', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: null,
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Test invalid JSON
    const invalidJSONInput: UpdateZoneInput = {
      id: zone.id,
      geometry: 'invalid json'
    };

    await expect(updateZone(invalidJSONInput)).rejects.toThrow(/Invalid JSON format for geometry/i);

    // Test invalid GeoJSON structure
    const invalidGeoJSONInput: UpdateZoneInput = {
      id: zone.id,
      geometry: JSON.stringify({ type: 'Point', coordinates: [0, 0] })
    };

    await expect(updateZone(invalidGeoJSONInput)).rejects.toThrow(/Invalid GeoJSON format - must be a Polygon/i);

    // Test missing coordinates
    const missingCoordsInput: UpdateZoneInput = {
      id: zone.id,
      geometry: JSON.stringify({ type: 'Polygon' })
    };

    await expect(updateZone(missingCoordsInput)).rejects.toThrow(/Invalid GeoJSON format - must be a Polygon/i);

    // Test invalid coordinates format
    const invalidCoordsInput: UpdateZoneInput = {
      id: zone.id,
      geometry: JSON.stringify({ type: 'Polygon', coordinates: 'invalid' })
    };

    await expect(updateZone(invalidCoordsInput)).rejects.toThrow(/Invalid GeoJSON coordinates/i);
  });

  it('should handle zero estimated_houses', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: null,
        geometry: validGeoJSON,
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Update to zero houses
    const updateInput: UpdateZoneInput = {
      id: zone.id,
      estimated_houses: 0
    };

    const result = await updateZone(updateInput);

    expect(result.estimated_houses).toEqual(0);
  });
});