import { logger, auditLogger } from '../config/logger';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { User, Role, UserRole, Permission, RoleName, PermissionAction } from '../types/auth';

export interface PermissionCheck {
  resource: string;
  action: PermissionAction;
  conditions?: Record<string, any>;
}

export interface RoleAssignment {
  userId: string;
  roleName: RoleName;
  grantedBy: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

class RBACService {
  private readonly cachePrefix = 'rbac:';
  private readonly cacheTTL = 900; // 15 minutes

  constructor() {
    this.setupPeriodicCleanup();
  }

  // Role Management
  async createRole(
    name: RoleName,
    description: string,
    permissions: string[],
    createdBy: string
  ): Promise<Role> {
    try {
      const roleId = await database.transaction(async (client) => {
        // Check if role already exists
        const existingRole = await client.query(
          'SELECT id FROM roles WHERE name = $1',
          [name]
        );

        if (existingRole.length > 0) {
          throw new Error(`Role ${name} already exists`);
        }

        // Create role
        const roleResult = await client.query(
          `INSERT INTO roles (name, description, permissions, is_system)
           VALUES ($1, $2, $3, false)
           RETURNING id`,
          [name, description, JSON.stringify(permissions)]
        );

        return roleResult[0].id;
      });

      const role = await this.getRoleById(roleId);
      
      auditLogger.userAction('role_created', createdBy, {
        roleId,
        roleName: name,
        permissions,
      });

      logger.info('Role created successfully', { roleId, name, createdBy });
      return role!;
    } catch (error) {
      logger.error('Failed to create role', {
        name,
        createdBy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async updateRole(
    roleId: string,
    updates: {
      description?: string;
      permissions?: string[];
    },
    updatedBy: string
  ): Promise<Role | null> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updates.description);
      }

      if (updates.permissions !== undefined) {
        updateFields.push(`permissions = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.permissions));
      }

      if (updateFields.length === 0) {
        return await this.getRoleById(roleId);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(roleId);

      await database.query(
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND is_system = false`,
        updateValues
      );

      // Clear cache
      await this.clearRoleCache(roleId);

      const updatedRole = await this.getRoleById(roleId);
      
      auditLogger.userAction('role_updated', updatedBy, {
        roleId,
        updates,
      });

      logger.info('Role updated successfully', { roleId, updatedBy });
      return updatedRole;
    } catch (error) {
      logger.error('Failed to update role', {
        roleId,
        updatedBy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async deleteRole(roleId: string, deletedBy: string): Promise<boolean> {
    try {
      const result = await database.transaction(async (client) => {
        // Check if role exists and is not a system role
        const roleResult = await client.query(
          'SELECT name, is_system FROM roles WHERE id = $1',
          [roleId]
        );

        if (roleResult.length === 0) {
          throw new Error('Role not found');
        }

        if (roleResult[0].is_system) {
          throw new Error('Cannot delete system role');
        }

        // Check if role is assigned to any users
        const assignmentResult = await client.query(
          'SELECT COUNT(*) FROM user_roles WHERE role_id = $1 AND is_active = true',
          [roleId]
        );

        if (parseInt(assignmentResult[0].count) > 0) {
          throw new Error('Cannot delete role that is assigned to users');
        }

        // Delete role
        await client.query('DELETE FROM roles WHERE id = $1', [roleId]);
        return roleResult[0].name;
      });

      // Clear cache
      await this.clearRoleCache(roleId);

      auditLogger.userAction('role_deleted', deletedBy, {
        roleId,
        roleName: result,
      });

      logger.info('Role deleted successfully', { roleId, deletedBy });
      return true;
    } catch (error) {
      logger.error('Failed to delete role', {
        roleId,
        deletedBy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getRoleById(roleId: string): Promise<Role | null> {
    try {
      // Try cache first
      const cached = await redis.get(`${this.cachePrefix}role:${roleId}`);
      if (cached) {
        return cached;
      }

      const results = await database.query(
        'SELECT * FROM roles WHERE id = $1',
        [roleId]
      );

      if (results.length === 0) {
        return null;
      }

      const role = this.mapDatabaseToRole(results[0]);
      
      // Cache for future use
      await redis.set(`${this.cachePrefix}role:${roleId}`, role, this.cacheTTL);
      
      return role;
    } catch (error) {
      logger.error('Failed to get role by ID', {
        roleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async getRoleByName(name: RoleName): Promise<Role | null> {
    try {
      // Try cache first
      const cached = await redis.get(`${this.cachePrefix}role_name:${name}`);
      if (cached) {
        return cached;
      }

      const results = await database.query(
        'SELECT * FROM roles WHERE name = $1',
        [name]
      );

      if (results.length === 0) {
        return null;
      }

      const role = this.mapDatabaseToRole(results[0]);
      
      // Cache for future use
      await redis.set(`${this.cachePrefix}role_name:${name}`, role, this.cacheTTL);
      
      return role;
    } catch (error) {
      logger.error('Failed to get role by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // User Role Assignment
  async assignRole(assignment: RoleAssignment): Promise<UserRole> {
    try {
      const { userId, roleName, grantedBy, expiresAt, metadata } = assignment;

      // Get role
      const role = await this.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      // Check if user exists
      const userExists = await this.userExists(userId);
      if (!userExists) {
        throw new Error('User not found');
      }

      const userRoleId = await database.transaction(async (client) => {
        // Check if assignment already exists
        const existingAssignment = await client.query(
          'SELECT id, is_active FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [userId, role.id]
        );

        if (existingAssignment.length > 0) {
          if (existingAssignment[0].is_active) {
            throw new Error(`User already has role ${roleName}`);
          }
          
          // Reactivate existing assignment
          await client.query(
            `UPDATE user_roles 
             SET is_active = true, granted_by = $1, granted_at = NOW(), expires_at = $2
             WHERE id = $3`,
            [grantedBy, expiresAt, existingAssignment[0].id]
          );
          
          return existingAssignment[0].id;
        }

        // Create new assignment
        const result = await client.query(
          `INSERT INTO user_roles (user_id, role_id, granted_by, expires_at)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, role.id, grantedBy, expiresAt]
        );

        return result[0].id;
      });

      // Clear user permissions cache
      await this.clearUserPermissionsCache(userId);

      const userRole = await this.getUserRoleById(userRoleId);
      
      auditLogger.accessLog('user_roles', 'grant', grantedBy, true, {
        userId,
        roleId: role.id,
        roleName,
        expiresAt,
        metadata,
      });

      logger.info('Role assigned successfully', {
        userId,
        roleId: role.id,
        roleName,
        grantedBy,
        expiresAt,
      });

      return userRole!;
    } catch (error) {
      logger.error('Failed to assign role', {
        userId: assignment.userId,
        roleName: assignment.roleName,
        grantedBy: assignment.grantedBy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async revokeRole(userId: string, roleName: RoleName, revokedBy: string): Promise<boolean> {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      const result = await database.query(
        `UPDATE user_roles 
         SET is_active = false, revoked_at = NOW(), revoked_by = $1
         WHERE user_id = $2 AND role_id = $3 AND is_active = true`,
        [revokedBy, userId, role.id]
      );

      if (result.rowCount === 0) {
        return false; // No active assignment found
      }

      // Clear user permissions cache
      await this.clearUserPermissionsCache(userId);

      auditLogger.accessLog('user_roles', 'revoke', revokedBy, true, {
        userId,
        roleId: role.id,
        roleName,
      });

      logger.info('Role revoked successfully', {
        userId,
        roleId: role.id,
        roleName,
        revokedBy,
      });

      return true;
    } catch (error) {
      logger.error('Failed to revoke role', {
        userId,
        roleName,
        revokedBy,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Permission Checking
  async hasPermission(userId: string, check: PermissionCheck): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check for wildcard admin permission
      if (userPermissions.includes('*:*')) {
        auditLogger.accessLog(check.resource, check.action, userId, true, {
          reason: 'admin_wildcard',
        });
        return true;
      }

      // Check for specific permission
      const requiredPermission = `${check.resource}:${check.action}`;
      const hasSpecificPermission = userPermissions.includes(requiredPermission);

      // Check for resource wildcard
      const resourceWildcard = `${check.resource}:*`;
      const hasResourceWildcard = userPermissions.includes(resourceWildcard);

      // Check for action wildcard
      const actionWildcard = `*:${check.action}`;
      const hasActionWildcard = userPermissions.includes(actionWildcard);

      const hasPermission = hasSpecificPermission || hasResourceWildcard || hasActionWildcard;

      // Apply conditions if permission exists
      if (hasPermission && check.conditions) {
        const conditionsMet = await this.checkPermissionConditions(
          userId,
          check.resource,
          check.conditions
        );
        
        auditLogger.accessLog(check.resource, check.action, userId, conditionsMet, {
          permissions: userPermissions,
          conditions: check.conditions,
          conditionsMet,
        });
        
        return conditionsMet;
      }

      auditLogger.accessLog(check.resource, check.action, userId, hasPermission, {
        permissions: userPermissions,
        requiredPermission,
      });

      return hasPermission;
    } catch (error) {
      logger.error('Permission check failed', {
        userId,
        check,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      auditLogger.accessLog(check.resource, check.action, userId, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Try cache first
      const cached = await redis.get(`${this.cachePrefix}user_permissions:${userId}`);
      if (cached) {
        return cached;
      }

      const results = await database.query(
        `SELECT DISTINCT jsonb_array_elements_text(r.permissions) as permission
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 
         AND ur.is_active = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
        [userId]
      );

      const permissions = results.map(row => row.permission);
      
      // Cache for future use
      await redis.set(
        `${this.cachePrefix}user_permissions:${userId}`,
        permissions,
        this.cacheTTL
      );

      return permissions;
    } catch (error) {
      logger.error('Failed to get user permissions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const results = await database.query(
        `SELECT ur.*, r.name as role_name, r.description as role_description,
                r.permissions as role_permissions, r.is_system as role_is_system
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 AND ur.is_active = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY ur.granted_at DESC`,
        [userId]
      );

      return results.map(row => this.mapDatabaseToUserRole(row));
    } catch (error) {
      logger.error('Failed to get user roles', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  // Permission condition checking
  private async checkPermissionConditions(
    userId: string,
    resource: string,
    conditions: Record<string, any>
  ): Promise<boolean> {
    // Common conditions that can be checked
    if (conditions.ownerId) {
      // User can only access their own resources
      return conditions.ownerId === userId;
    }

    if (conditions.organizationId) {
      // Check if user belongs to the organization
      const userOrg = await this.getUserOrganization(userId);
      return userOrg === conditions.organizationId;
    }

    if (conditions.requiredRole) {
      // Check if user has required role
      const userRoles = await this.getUserRoles(userId);
      return userRoles.some(ur => ur.role.name === conditions.requiredRole);
    }

    if (conditions.timeRestriction) {
      // Check time-based restrictions
      const now = new Date();
      const start = new Date(conditions.timeRestriction.start);
      const end = new Date(conditions.timeRestriction.end);
      return now >= start && now <= end;
    }

    // Default to true if no recognized conditions
    return true;
  }

  // Utility methods
  private async userExists(userId: string): Promise<boolean> {
    try {
      const results = await database.query(
        'SELECT 1 FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      return results.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async getUserOrganization(userId: string): Promise<string | null> {
    try {
      const results = await database.query(
        'SELECT metadata->\'organizationId\' as organization_id FROM users WHERE id = $1',
        [userId]
      );
      return results[0]?.organization_id || null;
    } catch (error) {
      return null;
    }
  }

  private async getUserRoleById(userRoleId: string): Promise<UserRole | null> {
    try {
      const results = await database.query(
        `SELECT ur.*, r.name as role_name, r.description as role_description,
                r.permissions as role_permissions, r.is_system as role_is_system
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.id = $1`,
        [userRoleId]
      );

      return results.length > 0 ? this.mapDatabaseToUserRole(results[0]) : null;
    } catch (error) {
      return null;
    }
  }

  private mapDatabaseToRole(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions || '[]'),
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDatabaseToUserRole(row: any): UserRole {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      role: {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        permissions: JSON.parse(row.role_permissions || '[]'),
        isSystem: row.role_is_system,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      grantedBy: row.granted_by,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
    };
  }

  // Cache management
  private async clearUserPermissionsCache(userId: string): Promise<void> {
    await redis.del(`${this.cachePrefix}user_permissions:${userId}`);
  }

  private async clearRoleCache(roleId: string): Promise<void> {
    // Get role to clear name cache
    const role = await database.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (role.length > 0) {
      await redis.del(`${this.cachePrefix}role_name:${role[0].name}`);
    }
    await redis.del(`${this.cachePrefix}role:${roleId}`);
  }

  // Cleanup expired role assignments
  private setupPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        const result = await database.query(
          `UPDATE user_roles 
           SET is_active = false 
           WHERE expires_at IS NOT NULL 
           AND expires_at < NOW() 
           AND is_active = true`
        );

        if (result.rowCount && result.rowCount > 0) {
          logger.info('Expired role assignments cleaned up', {
            count: result.rowCount,
          });
        }
      } catch (error) {
        logger.error('Failed to cleanup expired role assignments', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 3600000); // Run every hour
  }

  // Administrative methods
  async getRoleStatistics(): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalAssignments: number;
    activeAssignments: number;
  }> {
    try {
      const [roleStats, assignmentStats] = await Promise.all([
        database.query(`
          SELECT 
            COUNT(*) as total_roles,
            COUNT(CASE WHEN is_system = true THEN 1 END) as system_roles,
            COUNT(CASE WHEN is_system = false THEN 1 END) as custom_roles
          FROM roles
        `),
        database.query(`
          SELECT 
            COUNT(*) as total_assignments,
            COUNT(CASE WHEN is_active = true AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END) as active_assignments
          FROM user_roles
        `),
      ]);

      return {
        totalRoles: parseInt(roleStats[0].total_roles),
        systemRoles: parseInt(roleStats[0].system_roles),
        customRoles: parseInt(roleStats[0].custom_roles),
        totalAssignments: parseInt(assignmentStats[0].total_assignments),
        activeAssignments: parseInt(assignmentStats[0].active_assignments),
      };
    } catch (error) {
      logger.error('Failed to get role statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalRoles: 0,
        systemRoles: 0,
        customRoles: 0,
        totalAssignments: 0,
        activeAssignments: 0,
      };
    }
  }
}

export const rbacService = new RBACService();