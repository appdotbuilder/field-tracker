import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable, zoneAssignmentsTable } from '../db/schema';
import { type AssignZoneInput, type User, type Zone } from '../schema';
import { assignZone } from '../handlers/assign_zone';
import { eq, and } from 'drizzle-orm';

// Test data setup helpers
const createTestUser = async (): Promise<User> => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'user'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestAdmin = async (): Promise<User> => {
  const result = await db.insert(usersTable)
    .values({
      email: 'admin@example.com',
      password_hash: 'hashedpassword',
      role: 'admin'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestZone = async (createdBy: number): Promise<Zone> => {
  const result = await db.insert(zonesTable)
    .values({
      name: 'Test Zone',
      description: 'A test zone for assignment',
      geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
      estimated_houses: 100,
      created_by: createdBy
    })
    .returning()
    .execute();
  return result[0];
};

describe('assignZone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully assign a zone to a user', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const zone = await createTestZone(admin.id);

    const input: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user.id
    };

    const result = await assignZone(input);

    // Validate assignment details
    expect(result.zone_id).toEqual(zone.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.status).toEqual('assigned');
    expect(result.progress_houses).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.assigned_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save assignment to database', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const zone = await createTestZone(admin.id);

    const input: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user.id
    };

    const result = await assignZone(input);

    // Verify in database
    const assignments = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].zone_id).toEqual(zone.id);
    expect(assignments[0].user_id).toEqual(user.id);
    expect(assignments[0].status).toEqual('assigned');
    expect(assignments[0].progress_houses).toEqual(0);
    expect(assignments[0].assigned_at).toBeInstanceOf(Date);
    expect(assignments[0].completed_at).toBeNull();
  });

  it('should reject assignment to non-existent zone', async () => {
    const user = await createTestUser();

    const input: AssignZoneInput = {
      zone_id: 999999, // Non-existent zone
      user_id: user.id
    };

    await expect(assignZone(input)).rejects.toThrow(/Zone with id 999999 not found/i);
  });

  it('should reject assignment to non-existent user', async () => {
    const admin = await createTestAdmin();
    const zone = await createTestZone(admin.id);

    const input: AssignZoneInput = {
      zone_id: zone.id,
      user_id: 999999 // Non-existent user
    };

    await expect(assignZone(input)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should prevent assigning already assigned zone', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute()
      .then(result => result[0]);
    
    const zone = await createTestZone(admin.id);

    // First assignment should succeed
    const input1: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user1.id
    };
    await assignZone(input1);

    // Second assignment should fail
    const input2: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user2.id
    };

    await expect(assignZone(input2)).rejects.toThrow(/Zone .* is already assigned to another user/i);
  });

  it('should prevent assigning zone that is in progress', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute()
      .then(result => result[0]);
    
    const zone = await createTestZone(admin.id);

    // Create an in-progress assignment directly
    await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user1.id,
        status: 'in_progress',
        progress_houses: 10
      })
      .execute();

    // New assignment should fail
    const input: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user2.id
    };

    await expect(assignZone(input)).rejects.toThrow(/Zone .* is currently in progress by another user/i);
  });

  it('should allow assigning completed zone to new user', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute()
      .then(result => result[0]);
    
    const zone = await createTestZone(admin.id);

    // Create a completed assignment
    await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user1.id,
        status: 'completed',
        progress_houses: 100,
        completed_at: new Date()
      })
      .execute();

    // New assignment should succeed
    const input: AssignZoneInput = {
      zone_id: zone.id,
      user_id: user2.id
    };

    const result = await assignZone(input);
    
    expect(result.zone_id).toEqual(zone.id);
    expect(result.user_id).toEqual(user2.id);
    expect(result.status).toEqual('assigned');
  });

  it('should handle multiple assignments to different zones for same user', async () => {
    // Create test data
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const zone1 = await createTestZone(admin.id);
    const zone2 = await db.insert(zonesTable)
      .values({
        name: 'Test Zone 2',
        description: 'Another test zone',
        geometry: '{"type":"Polygon","coordinates":[[[2,2],[3,2],[3,3],[2,3],[2,2]]]}',
        estimated_houses: 150,
        created_by: admin.id
      })
      .returning()
      .execute()
      .then(result => result[0]);

    // Assign both zones to the same user
    const input1: AssignZoneInput = {
      zone_id: zone1.id,
      user_id: user.id
    };
    
    const input2: AssignZoneInput = {
      zone_id: zone2.id,
      user_id: user.id
    };

    const result1 = await assignZone(input1);
    const result2 = await assignZone(input2);

    // Both assignments should succeed
    expect(result1.zone_id).toEqual(zone1.id);
    expect(result1.user_id).toEqual(user.id);
    expect(result2.zone_id).toEqual(zone2.id);
    expect(result2.user_id).toEqual(user.id);

    // Verify both exist in database
    const assignments = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.user_id, user.id))
      .execute();

    expect(assignments).toHaveLength(2);
  });
});