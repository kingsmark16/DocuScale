import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from './workspace-access.service';

export const WORKSPACE_ROLES_KEY = 'workspace_roles';

export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
