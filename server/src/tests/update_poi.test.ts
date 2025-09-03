import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { poisTable, usersTable } from '../db/schema';
import { type UpdatePoiInput, type CreateUserInput } from '../schema';
import { updatePoi } from '../handlers/update_poi';
import { eq } from 'drizzle-orm';


// Test user data
const testUser: CreateUserInput = {
  email: 'creator@test.com',
  password: 'password123',
  role: 'admin'
};

// Test POI data
const testPoiData = {
  name: 'Original Billboard',
  description: 'Original description',
  latitude: 40.7128,
  longitude: -74.0060,
  poi_type: 'billboard' as const,
  created_by: 1 // Will be set after creating user
};

describe('updatePoi', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let poiId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password', // Simple hash for testing
        role: testUser.role
      })
      .returning()
      .execute();

    userId = userResult[0].id;

    // Create test POI
    const poiResult = await db.insert(poisTable)
      .values({
        ...testPoiData,
        latitude: testPoiData.latitude.toString(),
        longitude: testPoiData.longitude.toString(),
        created_by: userId
      })
      .returning()
      .execute();

    poiId = poiResult[0].id;
  });

  it('should update POI name', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      name: 'Updated Billboard Name'
    };

    const result = await updatePoi(updateInput);

    expect(result.id).toEqual(poiId);
    expect(result.name).toEqual('Updated Billboard Name');
    expect(result.description).toEqual(testPoiData.description);
    expect(result.latitude).toEqual(testPoiData.latitude);
    expect(result.longitude).toEqual(testPoiData.longitude);
    expect(result.poi_type).toEqual(testPoiData.poi_type);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update POI description', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      description: 'Updated description text'
    };

    const result = await updatePoi(updateInput);

    expect(result.description).toEqual('Updated description text');
    expect(result.name).toEqual(testPoiData.name); // Should remain unchanged
  });

  it('should update POI coordinates', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      latitude: 34.0522,
      longitude: -118.2437
    };

    const result = await updatePoi(updateInput);

    expect(result.latitude).toEqual(34.0522);
    expect(result.longitude).toEqual(-118.2437);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should update POI type', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      poi_type: 'wall'
    };

    const result = await updatePoi(updateInput);

    expect(result.poi_type).toEqual('wall');
    expect(result.name).toEqual(testPoiData.name); // Should remain unchanged
  });

  it('should update multiple fields simultaneously', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      name: 'Multi-Update Billboard',
      description: 'Multi-updated description',
      latitude: 51.5074,
      longitude: -0.1278,
      poi_type: 'other'
    };

    const result = await updatePoi(updateInput);

    expect(result.name).toEqual('Multi-Update Billboard');
    expect(result.description).toEqual('Multi-updated description');
    expect(result.latitude).toEqual(51.5074);
    expect(result.longitude).toEqual(-0.1278);
    expect(result.poi_type).toEqual('other');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      description: null
    };

    const result = await updatePoi(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(testPoiData.name); // Should remain unchanged
  });

  it('should save updates to database', async () => {
    const updateInput: UpdatePoiInput = {
      id: poiId,
      name: 'DB Update Test',
      latitude: 48.8566,
      longitude: 2.3522
    };

    await updatePoi(updateInput);

    // Verify in database
    const pois = await db.select()
      .from(poisTable)
      .where(eq(poisTable.id, poiId))
      .execute();

    expect(pois).toHaveLength(1);
    expect(pois[0].name).toEqual('DB Update Test');
    expect(parseFloat(pois[0].latitude)).toEqual(48.8566);
    expect(parseFloat(pois[0].longitude)).toEqual(2.3522);
    expect(pois[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent POI', async () => {
    const updateInput: UpdatePoiInput = {
      id: 99999,
      name: 'Non-existent POI'
    };

    await expect(updatePoi(updateInput)).rejects.toThrow(/POI with id 99999 not found/i);
  });

  it('should validate latitude range', async () => {
    const invalidLatInput: UpdatePoiInput = {
      id: poiId,
      latitude: 91 // Invalid - above 90
    };

    await expect(updatePoi(invalidLatInput)).rejects.toThrow(/latitude must be between -90 and 90/i);

    const invalidLatInput2: UpdatePoiInput = {
      id: poiId,
      latitude: -91 // Invalid - below -90
    };

    await expect(updatePoi(invalidLatInput2)).rejects.toThrow(/latitude must be between -90 and 90/i);
  });

  it('should validate longitude range', async () => {
    const invalidLngInput: UpdatePoiInput = {
      id: poiId,
      longitude: 181 // Invalid - above 180
    };

    await expect(updatePoi(invalidLngInput)).rejects.toThrow(/longitude must be between -180 and 180/i);

    const invalidLngInput2: UpdatePoiInput = {
      id: poiId,
      longitude: -181 // Invalid - below -180
    };

    await expect(updatePoi(invalidLngInput2)).rejects.toThrow(/longitude must be between -180 and 180/i);
  });

  it('should accept valid boundary coordinates', async () => {
    const boundaryInput: UpdatePoiInput = {
      id: poiId,
      latitude: 90, // Valid boundary
      longitude: 180 // Valid boundary
    };

    const result = await updatePoi(boundaryInput);

    expect(result.latitude).toEqual(90);
    expect(result.longitude).toEqual(180);

    const negativeBoundaryInput: UpdatePoiInput = {
      id: poiId,
      latitude: -90, // Valid boundary
      longitude: -180 // Valid boundary
    };

    const result2 = await updatePoi(negativeBoundaryInput);

    expect(result2.latitude).toEqual(-90);
    expect(result2.longitude).toEqual(-180);
  });

  it('should update only specified fields and leave others unchanged', async () => {
    // Update only name
    const nameOnlyInput: UpdatePoiInput = {
      id: poiId,
      name: 'Name Only Update'
    };

    const result = await updatePoi(nameOnlyInput);

    expect(result.name).toEqual('Name Only Update');
    expect(result.description).toEqual(testPoiData.description);
    expect(result.latitude).toEqual(testPoiData.latitude);
    expect(result.longitude).toEqual(testPoiData.longitude);
    expect(result.poi_type).toEqual(testPoiData.poi_type);
  });
});