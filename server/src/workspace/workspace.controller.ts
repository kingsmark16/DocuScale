import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceRole } from './workspace-access.service';
import { WorkspaceRolesGuard } from './workspace-roles.guard';
import { WorkspaceRoles } from './workspace-roles.decorator';

type WorkspaceRequest = Request & {
  workspaceRole?: WorkspaceRole;
};

@Controller('api/w/:workspaceId')
@UseGuards(WorkspaceRolesGuard)
export class WorkspaceController {
  @Get('access')
  @WorkspaceRoles('viewer', 'editor', 'admin', 'owner')
  getAccess(
    @Param('workspaceId') workspaceId: string,
    @Req() request: WorkspaceRequest,
  ) {
    return {
      workspaceId,
      role: request.workspaceRole,
    };
  }
}
