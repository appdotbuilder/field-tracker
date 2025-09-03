import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poisTable } from '../db/schema';
import { type CreateUserInput, type CreatePoiInput } from '../schema';
import { getNearbyPois } from '../handlers/get_nearby_pois';

describe('getNearbyPois', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find POIs within specified radius', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create test POIs at known coordinates
    // Central point: London (51.5074, -0.1278)
    // Nearby POI: ~1km away
    // Far POI: ~10km away
    await db.insert(poisTable)
      .values([
        {
          name: 'Central Billboard',
          description: 'Right in the center',
          latitude: '51.5074',
          longitude: '-0.1278',
          poi_type: 'billboard',
          created_by: testUser.id
        },
        {
          name: 'Nearby Wall',
          description: 'About 1km away',
          latitude: '51.5164',
          longitude: '-0.1278',
          poi_type: 'wall',
          created_by: testUser.id
        },
        {
          name: 'Far Location',
          description: 'About 10km away',
          latitude: '51.4074',
          longitude: '-0.1278',
          poi_type: 'other',
          created_by: testUser.id
        }
      ])
      .execute();

    // Search within 5km radius from central London
    const nearbyPois = await getNearbyPois(51.5074, -0.1278, 5);

    // Should find 2 POIs (central + nearby), but not the far one
    expect(nearbyPois).toHaveLength(2);
    
    // Should be ordered by distance (closest first)
    expect(nearbyPois[0].name).toEqual('Central Billboard');
    expect(nearbyPois[1].name).toEqual('Nearby Wall');

    // Verify numeric field conversions
    nearbyPois.forEach(poi => {
      expect(typeof poi.latitude).toBe('number');
      expect(typeof poi.longitude).toBe('number');
      expect(poi.latitude).toBeCloseTo(51.5, 1);
      expect(poi.longitude).toBeCloseTo(-0.1, 1);
    });
  });

  it('should return empty array when no POIs within radius', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create a POI very far away
    await db.insert(poisTable)
      .values({
        name: 'Distant POI',
        description: 'Very far away',
        latitude: '40.7589', // New York coordinates
        longitude: '-73.9851',
        poi_type: 'billboard',
        created_by: testUser.id
      })
      .execute();

    // Search near London - should find nothing
    const nearbyPois = await getNearbyPois(51.5074, -0.1278, 5);

    expect(nearbyPois).toHaveLength(0);
  });

  it('should respect custom radius parameter', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create POIs at different distances
    await db.insert(poisTable)
      .values([
        {
          name: 'Very Close',
          description: 'Less than 1km',
          latitude: '51.5084',
          longitude: '-0.1278',
          poi_type: 'billboard',
          created_by: testUser.id
        },
        {
          name: 'Medium Distance',
          description: 'About 3km away',
          latitude: '51.5344',
          longitude: '-0.1278',
          poi_type: 'wall',
          created_by: testUser.id
        }
      ])
      .execute();

    // Search with 1km radius - should find only the very close one
    const closeOnly = await getNearbyPois(51.5074, -0.1278, 1);
    expect(closeOnly).toHaveLength(1);
    expect(closeOnly[0].name).toEqual('Very Close');

    // Search with 5km radius - should find both
    const bothPois = await getNearbyPois(51.5074, -0.1278, 5);
    expect(bothPois).toHaveLength(2);
    expect(bothPois.map(poi => poi.name)).toContain('Very Close');
    expect(bothPois.map(poi => poi.name)).toContain('Medium Distance');
  });

  it('should use default radius of 5km when not specified', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create a POI about 3km away
    await db.insert(poisTable)
      .values({
        name: 'Default Radius Test',
        description: 'Within default 5km',
        latitude: '51.5344',
        longitude: '-0.1278',
        poi_type: 'billboard',
        created_by: testUser.id
      })
      .execute();

    // Call without radius parameter - should use default 5km
    const nearbyPois = await getNearbyPois(51.5074, -0.1278);

    expect(nearbyPois).toHaveLength(1);
    expect(nearbyPois[0].name).toEqual('Default Radius Test');
  });

  it('should handle all POI types correctly', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    const testUser = userResult[0];

    // Create POIs of different types
    await db.insert(poisTable)
      .values([
        {
          name: 'Test Billboard',
          description: 'Billboard type',
          latitude: '51.5074',
          longitude: '-0.1278',
          poi_type: 'billboard',
          created_by: testUser.id
        },
        {
          name: 'Test Wall',
          description: 'Wall type',
          latitude: '51.5074',
          longitude: '-0.1178',
          poi_type: 'wall',
          created_by: testUser.id
        },
        {
          name: 'Test Other',
          description: 'Other type',
          latitude: '51.5074',
          longitude: '-0.1378',
          poi_type: 'other',
          created_by: testUser.id
        }
      ])
      .execute();

    const nearbyPois = await getNearbyPois(51.5074, -0.1278, 5);

    expect(nearbyPois).toHaveLength(3);
    
    // Check that all POI types are included
    const poiTypes = nearbyPois.map(poi => poi.poi_type);
    expect(poiTypes).toContain('billboard');
    expect(poiTypes).toContain('wall');
    expect(poiTypes).toContain('other');

    // Verify all fields are present and properly typed
    nearbyPois.forEach(poi => {
      expect(poi.id).toBeDefined();
      expect(typeof poi.name).toBe('string');
      expect(typeof poi.latitude).toBe('number');
      expect(typeof poi.longitude).toBe('number');
      expect(typeof poi.poi_type).toBe('string');
      expect(typeof poi.created_by).toBe('number');
      expect(poi.created_at).toBeInstanceOf(Date);
      expect(poi.updated_at).toBeInstanceOf(Date);
    });
  });
});