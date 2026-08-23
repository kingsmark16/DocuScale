import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export const WORKSPACE_ROLE_CACHE_TTL_SECONDS = 60;

const WORKSPACE_ROLE = ['owner', 'admin', 'editor', 'viewer'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLE)[number];

@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getRole(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole | null> {
    const cacheKey = this.getCacheKey(userId, workspaceId);
    const cacheRole = await this.redis.get(cacheKey);

    if (cacheRole !== null) {
      return this.normalizeRole(cacheRole);
    }

    const member = await this.prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspaceId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!member) {
      return null;
    }

    const role = this.normalizeRole(member.role);

    if (role !== null) {
      await this.redis.set(cacheKey, role, WORKSPACE_ROLE_CACHE_TTL_SECONDS);
    }

    return role;
  }

  async hasAnyRole(
    userId: string,
    workspaceId: string,
    allowedRoles: readonly WorkspaceRole[],
  ): Promise<boolean> {
    const role = await this.getRole(userId, workspaceId);

    return role !== null && allowedRoles.includes(role);
  }

  async invalidate(userId: string, workspaceId: string): Promise<void> {
    await this.redis.del(this.getCacheKey(userId, workspaceId));
  }

  private getCacheKey(userId: string, workspaceId: string): string {
    return `rbac:workspace:${workspaceId}:user:${userId}`;
  }
  private normalizeRole(role: string): WorkspaceRole | null {
    if (role === 'member') {
      return 'viewer';
    }

    return WORKSPACE_ROLE.includes(role as WorkspaceRole)
      ? (role as WorkspaceRole)
      : null;
  }
}
