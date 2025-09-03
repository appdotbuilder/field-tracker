import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable } from '../db/schema';
import { getZones } from '../handlers/get_zones';

describe('getZones', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no zones exist', async () => {
    const result = await getZones();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all zones when zones exist', async () => {
    // Create a test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test zones
    await db.insert(zonesTable)
      .values([
        {
          name: 'Zone A',
          description: 'First test zone',
          geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
          estimated_houses: 100,
          created_by: userId
        },
        {
          name: 'Zone B',
          description: null,
          geometry: '{"type":"Polygon","coordinates":[[[2,2],[3,2],[3,3],[2,3],[2,2]]]}',
          estimated_houses: 200,
          created_by: userId
        },
        {
          name: 'Zone C',
          description: 'Third test zone',
          geometry: '{"type":"Polygon","coordinates":[[[4,4],[5,4],[5,5],[4,5],[4,4]]]}',
          estimated_houses: 150,
          created_by: userId
        }
      ])
      .execute();

    const result = await getZones();

    expect(result).toHaveLength(3);
    
    // Verify structure and types
    result.forEach(zone => {
      expect(zone.id).toBeDefined();
      expect(typeof zone.name).toBe('string');
      expect(typeof zone.geometry).toBe('string');
      expect(typeof zone.estimated_houses).toBe('number');
      expect(typeof zone.created_by).toBe('number');
      expect(zone.created_at).toBeInstanceOf(Date);
      expect(zone.updated_at).toBeInstanceOf(Date);
      // description can be string or null
      expect(zone.description === null || typeof zone.description === 'string').toBe(true);
    });

    // Verify specific zone data
    const zoneNames = result.map(z => z.name).sort();
    expect(zoneNames).toEqual(['Zone A', 'Zone B', 'Zone C']);

    const zoneA = result.find(z => z.name === 'Zone A');
    expect(zoneA?.description).toBe('First test zone');
    expect(zoneA?.estimated_houses).toBe(100);
    expect(zoneA?.created_by).toBe(userId);

    const zoneB = result.find(z => z.name === 'Zone B');
    expect(zoneB?.description).toBeNull();
    expect(zoneB?.estimated_houses).toBe(200);
  });

  it('should handle zones created by different users', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@example.com',
          password_hash: 'hashed_password',
          role: 'admin'
        },
        {
          email: 'user@example.com',
          password_hash: 'hashed_password',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    const adminId = users[0].id;
    const userId = users[1].id;

    // Create zones by different users
    await db.insert(zonesTable)
      .values([
        {
          name: 'Admin Zone',
          description: 'Created by admin',
          geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
          estimated_houses: 100,
          created_by: adminId
        },
        {
          name: 'User Zone',
          description: 'Created by user',
          geometry: '{"type":"Polygon","coordinates":[[[2,2],[3,2],[3,3],[2,3],[2,2]]]}',
          estimated_houses: 50,
          created_by: userId
        }
      ])
      .execute();

    const result = await getZones();

    expect(result).toHaveLength(2);
    
    // Verify both zones are returned regardless of creator
    const adminZone = result.find(z => z.name === 'Admin Zone');
    const userZone = result.find(z => z.name === 'User Zone');

    expect(adminZone).toBeDefined();
    expect(userZone).toBeDefined();
    expect(adminZone?.created_by).toBe(adminId);
    expect(userZone?.created_by).toBe(userId);
  });

  it('should return zones with valid GeoJSON geometry', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create zone with complex GeoJSON
    const complexGeometry = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [100.0, 0.0],
          [101.0, 0.0],
          [101.0, 1.0],
          [100.0, 1.0],
          [100.0, 0.0]
        ]
      ]
    });

    await db.insert(zonesTable)
      .values({
        name: 'Complex Zone',
        description: 'Zone with complex geometry',
        geometry: complexGeometry,
        estimated_houses: 300,
        created_by: userId
      })
      .execute();

    const result = await getZones();

    expect(result).toHaveLength(1);
    
    const zone = result[0];
    expect(zone.geometry).toBe(complexGeometry);
    
    // Verify geometry can be parsed as valid JSON
    const parsedGeometry = JSON.parse(zone.geometry);
    expect(parsedGeometry.type).toBe('Polygon');
    expect(parsedGeometry.coordinates).toBeDefined();
    expect(Array.isArray(parsedGeometry.coordinates)).toBe(true);
  });
});