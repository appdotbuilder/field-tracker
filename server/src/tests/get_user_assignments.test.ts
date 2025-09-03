import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable, zoneAssignmentsTable } from '../db/schema';
import { getUserAssignments } from '../handlers/get_user_assignments';

describe('getUserAssignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no assignments', async () => {
    // Create a user without any assignments
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const result = await getUserAssignments(user.id);

    expect(result).toEqual([]);
  });

  it('should return user assignments with all fields', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [admin] = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();

    const [zone] = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A test zone',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: admin.id
      })
      .returning()
      .execute();

    // Create zone assignment
    const [assignment] = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user.id,
        status: 'assigned',
        progress_houses: 0
      })
      .returning()
      .execute();

    const result = await getUserAssignments(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(assignment.id);
    expect(result[0].zone_id).toEqual(zone.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].status).toEqual('assigned');
    expect(result[0].progress_houses).toEqual(0);
    expect(result[0].assigned_at).toBeInstanceOf(Date);
    expect(result[0].completed_at).toBeNull();
  });

  it('should return multiple assignments for a user', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [admin] = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create multiple zones
    const [zone1] = await db.insert(zonesTable)
      .values({
        name: 'Zone 1',
        description: 'First zone',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: admin.id
      })
      .returning()
      .execute();

    const [zone2] = await db.insert(zonesTable)
      .values({
        name: 'Zone 2',
        description: 'Second zone',
        geometry: '{"type":"Polygon","coordinates":[[[1,0],[2,0],[2,1],[1,1],[1,0]]]}',
        estimated_houses: 150,
        created_by: admin.id
      })
      .returning()
      .execute();

    // Create multiple assignments with different statuses
    await db.insert(zoneAssignmentsTable)
      .values([
        {
          zone_id: zone1.id,
          user_id: user.id,
          status: 'in_progress',
          progress_houses: 50
        },
        {
          zone_id: zone2.id,
          user_id: user.id,
          status: 'completed',
          progress_houses: 150,
          completed_at: new Date()
        }
      ])
      .execute();

    const result = await getUserAssignments(user.id);

    expect(result).toHaveLength(2);
    
    // Check first assignment (in_progress)
    const inProgressAssignment = result.find(a => a.status === 'in_progress');
    expect(inProgressAssignment).toBeDefined();
    expect(inProgressAssignment!.zone_id).toEqual(zone1.id);
    expect(inProgressAssignment!.progress_houses).toEqual(50);
    expect(inProgressAssignment!.completed_at).toBeNull();

    // Check second assignment (completed)
    const completedAssignment = result.find(a => a.status === 'completed');
    expect(completedAssignment).toBeDefined();
    expect(completedAssignment!.zone_id).toEqual(zone2.id);
    expect(completedAssignment!.progress_houses).toEqual(150);
    expect(completedAssignment!.completed_at).toBeInstanceOf(Date);
  });

  it('should only return assignments for specified user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [admin] = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create zones
    const [zone1] = await db.insert(zonesTable)
      .values({
        name: 'Zone 1',
        description: 'First zone',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: admin.id
      })
      .returning()
      .execute();

    const [zone2] = await db.insert(zonesTable)
      .values({
        name: 'Zone 2',
        description: 'Second zone',
        geometry: '{"type":"Polygon","coordinates":[[[1,0],[2,0],[2,1],[1,1],[1,0]]]}',
        estimated_houses: 150,
        created_by: admin.id
      })
      .returning()
      .execute();

    // Create assignments for both users
    await db.insert(zoneAssignmentsTable)
      .values([
        {
          zone_id: zone1.id,
          user_id: user1.id,
          status: 'assigned',
          progress_houses: 0
        },
        {
          zone_id: zone2.id,
          user_id: user2.id,
          status: 'assigned',
          progress_houses: 0
        }
      ])
      .execute();

    // Get assignments for user1
    const user1Assignments = await getUserAssignments(user1.id);
    expect(user1Assignments).toHaveLength(1);
    expect(user1Assignments[0].user_id).toEqual(user1.id);
    expect(user1Assignments[0].zone_id).toEqual(zone1.id);

    // Get assignments for user2
    const user2Assignments = await getUserAssignments(user2.id);
    expect(user2Assignments).toHaveLength(1);
    expect(user2Assignments[0].user_id).toEqual(user2.id);
    expect(user2Assignments[0].zone_id).toEqual(zone2.id);
  });

  it('should handle non-existent user gracefully', async () => {
    const nonExistentUserId = 99999;

    const result = await getUserAssignments(nonExistentUserId);

    expect(result).toEqual([]);
  });
});