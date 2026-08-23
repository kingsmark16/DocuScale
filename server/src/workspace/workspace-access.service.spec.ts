import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  WORKSPACE_ROLE_CACHE_TTL_SECONDS,
  WorkspaceAccessService,
} from './workspace-access.service';

describe('WorkspaceAccessService', () => {
  type FindUniqueArgs = {
    where: {
      organizationId_userId: {
        organizationId: string;
        userId: string;
      };
    };
    select: {
      role: true;
    };
  };

  const findUnique =
    jest.fn<(args: FindUniqueArgs) => Promise<{ role: string } | null>>();

  const redisGet = jest.fn<(key: string) => Promise<string | null>>();

  const redisSet =
    jest.fn<
      (key: string, value: string, ttlSeconds?: number) => Promise<void>
    >();

  const redisDel = jest.fn<(key: string) => Promise<void>>();

  const prisma = {
    member: {
      findUnique,
    },
  } as unknown as PrismaService;

  const redis = {
    get: redisGet,
    set: redisSet,
    del: redisDel,
  } as unknown as RedisService;

  const service = new WorkspaceAccessService(prisma, redis);

  beforeEach(() => {
    findUnique.mockReset();
    redisGet.mockReset();
    redisSet.mockReset();
    redisDel.mockReset();
  });

  it('loads the role from PostgreSQL and caches it', async () => {
    redisGet.mockResolvedValue(null);
    findUnique.mockResolvedValue({ role: 'owner' });

    await expect(service.getRole('user-1', 'workspace-1')).resolves.toBe(
      'owner',
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: 'workspace-1',
          userId: 'user-1',
        },
      },
      select: {
        role: true,
      },
    });

    expect(redisSet).toHaveBeenCalledWith(
      'rbac:workspace:workspace-1:user:user-1',
      'owner',
      WORKSPACE_ROLE_CACHE_TTL_SECONDS,
    );
  });

  it('uses the cached role without querying PostgreSQL', async () => {
    redisGet.mockResolvedValue('editor');

    await expect(service.getRole('user-1', 'workspace-1')).resolves.toBe(
      'editor',
    );

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('maps Better Auth member role to viewer', async () => {
    redisGet.mockResolvedValue(null);
    findUnique.mockResolvedValue({ role: 'member' });

    await expect(service.getRole('user-1', 'workspace-1')).resolves.toBe(
      'viewer',
    );
  });
});
