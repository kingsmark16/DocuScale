import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DatabaseModule } from '../database/database.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [DatabaseModule, WorkspaceModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
