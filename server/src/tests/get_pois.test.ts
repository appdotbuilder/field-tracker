import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poisTable } from '../db/schema';
import { type CreateUserInput, type CreatePoiInput } from '../schema';
import { getPois } from '../handlers/get_pois';

// Test user input
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'admin'
};

// Test POI inputs
const testPoi1: CreatePoiInput = {
  name: 'Billboard A',
  description: 'Main street billboard',
  latitude: 40.7128,
  longitude: -74.0060,
  poi_type: 'billboard',
  created_by: 1
};

const testPoi2: CreatePoiInput = {
  name: 'Wall B',
  description: null,
  latitude: 40.7589,
  longitude: -73.9851,
  poi_type: 'wall',
  created_by: 1
};

const testPoi3: CreatePoiInput = {
  name: 'Other Location',
  description: 'Special location for posters',
  latitude: 40.7505,
  longitude: -73.9934,
  poi_type: 'other',
  created_by: 1
};

describe('getPois', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no POIs exist', async () => {
    const result = await getPois();
    
    expect(result).toEqual([]);
  });

  it('should return all POIs', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .execute();

    // Create test POIs
    await db.insert(poisTable)
      .values([
        {
          name: testPoi1.name,
          description: testPoi1.description,
          latitude: testPoi1.latitude.toString(),
          longitude: testPoi1.longitude.toString(),
          poi_type: testPoi1.poi_type,
          created_by: testPoi1.created_by
        },
        {
          name: testPoi2.name,
          description: testPoi2.description,
          latitude: testPoi2.latitude.toString(),
          longitude: testPoi2.longitude.toString(),
          poi_type: testPoi2.poi_type,
          created_by: testPoi2.created_by
        },
        {
          name: testPoi3.name,
          description: testPoi3.description,
          latitude: testPoi3.latitude.toString(),
          longitude: testPoi3.longitude.toString(),
          poi_type: testPoi3.poi_type,
          created_by: testPoi3.created_by
        }
      ])
      .execute();

    const result = await getPois();

    expect(result).toHaveLength(3);
    
    // Verify first POI
    expect(result[0].name).toEqual('Billboard A');
    expect(result[0].description).toEqual('Main street billboard');
    expect(result[0].latitude).toEqual(40.7128);
    expect(result[0].longitude).toEqual(-74.0060);
    expect(result[0].poi_type).toEqual('billboard');
    expect(result[0].created_by).toEqual(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second POI (with null description)
    expect(result[1].name).toEqual('Wall B');
    expect(result[1].description).toBeNull();
    expect(result[1].latitude).toEqual(40.7589);
    expect(result[1].longitude).toEqual(-73.9851);
    expect(result[1].poi_type).toEqual('wall');

    // Verify third POI
    expect(result[2].name).toEqual('Other Location');
    expect(result[2].description).toEqual('Special location for posters');
    expect(result[2].poi_type).toEqual('other');
  });

  it('should convert numeric coordinates correctly', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .execute();

    // Create POI with precise coordinates
    await db.insert(poisTable)
      .values({
        name: 'Precision Test',
        description: 'Testing coordinate precision',
        latitude: '40.12345678',
        longitude: '-73.98765432',
        poi_type: 'billboard',
        created_by: 1
      })
      .execute();

    const result = await getPois();

    expect(result).toHaveLength(1);
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
    expect(result[0].latitude).toEqual(40.12345678);
    expect(result[0].longitude).toEqual(-73.98765432);
  });

  it('should handle all POI types', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .execute();

    // Create POIs with different types
    await db.insert(poisTable)
      .values([
        {
          name: 'Billboard Test',
          description: 'Billboard location',
          latitude: '40.7128',
          longitude: '-74.0060',
          poi_type: 'billboard',
          created_by: 1
        },
        {
          name: 'Wall Test',
          description: 'Wall location',
          latitude: '40.7589',
          longitude: '-73.9851',
          poi_type: 'wall',
          created_by: 1
        },
        {
          name: 'Other Test',
          description: 'Other location',
          latitude: '40.7505',
          longitude: '-73.9934',
          poi_type: 'other',
          created_by: 1
        }
      ])
      .execute();

    const result = await getPois();

    expect(result).toHaveLength(3);
    
    const poiTypes = result.map(poi => poi.poi_type);
    expect(poiTypes).toContain('billboard');
    expect(poiTypes).toContain('wall');
    expect(poiTypes).toContain('other');
  });

  it('should return POIs in database insertion order', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .execute();

    // Create POIs in specific order
    await db.insert(poisTable)
      .values({
        name: 'First POI',
        description: 'First inserted',
        latitude: '40.7128',
        longitude: '-74.0060',
        poi_type: 'billboard',
        created_by: 1
      })
      .execute();

    await db.insert(poisTable)
      .values({
        name: 'Second POI',
        description: 'Second inserted',
        latitude: '40.7589',
        longitude: '-73.9851',
        poi_type: 'wall',
        created_by: 1
      })
      .execute();

    const result = await getPois();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First POI');
    expect(result[1].name).toEqual('Second POI');
    
    // Verify IDs are sequential
    expect(result[0].id).toBeLessThan(result[1].id);
  });
});