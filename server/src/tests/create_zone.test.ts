import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { zonesTable, usersTable } from '../db/schema';
import { type CreateZoneInput } from '../schema';
import { createZone } from '../handlers/create_zone';
import { eq } from 'drizzle-orm';

// Valid GeoJSON polygon for testing
const validPolygon = {
  "type": "Polygon",
  "coordinates": [
    [
      [-74.0059, 40.7128],
      [-74.0059, 40.7228],
      [-73.9959, 40.7228],
      [-73.9959, 40.7128],
      [-74.0059, 40.7128]
    ]
  ]
};

const testInput: CreateZoneInput = {
  name: 'Downtown Zone',
  description: 'Main downtown leaflet distribution area',
  geometry: JSON.stringify(validPolygon),
  estimated_houses: 500,
  created_by: 1 // Will be set after creating admin user
};

describe('createZone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a zone with admin user', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const inputWithAdminUser = {
      ...testInput,
      created_by: adminUser[0].id
    };

    const result = await createZone(inputWithAdminUser);

    // Basic field validation
    expect(result.name).toEqual('Downtown Zone');
    expect(result.description).toEqual('Main downtown leaflet distribution area');
    expect(result.geometry).toEqual(JSON.stringify(validPolygon));
    expect(result.estimated_houses).toEqual(500);
    expect(result.created_by).toEqual(adminUser[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save zone to database', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const inputWithAdminUser = {
      ...testInput,
      created_by: adminUser[0].id
    };

    const result = await createZone(inputWithAdminUser);

    // Query database to verify zone was saved
    const zones = await db.select()
      .from(zonesTable)
      .where(eq(zonesTable.id, result.id))
      .execute();

    expect(zones).toHaveLength(1);
    expect(zones[0].name).toEqual('Downtown Zone');
    expect(zones[0].description).toEqual('Main downtown leaflet distribution area');
    expect(zones[0].geometry).toEqual(JSON.stringify(validPolygon));
    expect(zones[0].estimated_houses).toEqual(500);
    expect(zones[0].created_by).toEqual(adminUser[0].id);
    expect(zones[0].created_at).toBeInstanceOf(Date);
    expect(zones[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject creation by regular user', async () => {
    // Create regular user
    const regularUser = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    const inputWithRegularUser = {
      ...testInput,
      created_by: regularUser[0].id
    };

    await expect(createZone(inputWithRegularUser))
      .rejects.toThrow(/only admin users can create zones/i);
  });

  it('should reject creation with non-existent user', async () => {
    const inputWithFakeUser = {
      ...testInput,
      created_by: 9999 // Non-existent user ID
    };

    await expect(createZone(inputWithFakeUser))
      .rejects.toThrow(/user not found/i);
  });

  it('should reject invalid GeoJSON geometry', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const inputWithInvalidGeometry = {
      ...testInput,
      created_by: adminUser[0].id,
      geometry: '{"invalid": "geometry"}' // Invalid GeoJSON
    };

    await expect(createZone(inputWithInvalidGeometry))
      .rejects.toThrow(/invalid geojson geometry format/i);
  });

  it('should reject non-polygon GeoJSON geometry', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const pointGeometry = {
      "type": "Point",
      "coordinates": [-74.0059, 40.7128]
    };

    const inputWithPointGeometry = {
      ...testInput,
      created_by: adminUser[0].id,
      geometry: JSON.stringify(pointGeometry) // Point instead of Polygon
    };

    await expect(createZone(inputWithPointGeometry))
      .rejects.toThrow(/invalid geojson geometry format/i);
  });

  it('should reject malformed JSON geometry', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const inputWithMalformedJSON = {
      ...testInput,
      created_by: adminUser[0].id,
      geometry: '{"type": "Polygon", "coordinates": [' // Malformed JSON
    };

    await expect(createZone(inputWithMalformedJSON))
      .rejects.toThrow(/invalid geojson geometry format/i);
  });

  it('should handle null description correctly', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const inputWithNullDescription = {
      ...testInput,
      description: null,
      created_by: adminUser[0].id
    };

    const result = await createZone(inputWithNullDescription);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Downtown Zone');
    expect(result.estimated_houses).toEqual(500);
  });

  it('should validate polygon has minimum required points', async () => {
    // Create admin user first
    const adminUser = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Polygon with too few points (needs at least 4)
    const invalidPolygon = {
      "type": "Polygon",
      "coordinates": [
        [
          [-74.0059, 40.7128],
          [-74.0059, 40.7228],
          [-73.9959, 40.7228] // Missing closing point, only 3 points
        ]
      ]
    };

    const inputWithInvalidPolygon = {
      ...testInput,
      created_by: adminUser[0].id,
      geometry: JSON.stringify(invalidPolygon)
    };

    await expect(createZone(inputWithInvalidPolygon))
      .rejects.toThrow(/invalid geojson geometry format/i);
  });
});