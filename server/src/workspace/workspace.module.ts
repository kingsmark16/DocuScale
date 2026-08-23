import { Module } from '@nestjs/common';
import { WorkspaceAccessService } from './workspace-access.service';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceRolesGuard } from './workspace-roles.guard';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [WorkspaceAccessService, WorkspaceRolesGuard],
  exports: [WorkspaceAccessService, WorkspaceRolesGuard],
  controllers: [WorkspaceController],
})
export class WorkspaceModule {}
