import { Request } from 'express';
import {
  WorkspaceAccessService,
  WorkspaceRole,
} from './workspace-access.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WORKSPACE_ROLES_KEY } from './workspace-roles.decorator';

type WorkspaceRequest = Request & {
  user?: {
    id: string;
  };
  workspaceRole?: WorkspaceRole;
  params: {
    workspaceId?: string;
  };
};

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const userId = request.user?.id;
    const workspaceId = request.params.workspaceId;

    if (!userId) {
      throw new UnauthorizedException();
    }

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID is required');
    }

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      throw new ForbiddenException('Workspace roles are not configured');
    }

    const role = await this.workspaceAccess.getRole(userId, workspaceId);

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }

    request.workspaceRole = role;

    return true;
  }
}
