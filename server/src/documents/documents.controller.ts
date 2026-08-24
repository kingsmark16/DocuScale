import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';
import { DocumentsService } from './documents.service';
import { WorkspaceRoles } from '../workspace/workspace-roles.decorator';
import {
  DocumentParamsDto,
  WorkspaceDocumentParamsDto,
} from './dto/document-params.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('api/w/:workspaceId/docs')
@UseGuards(WorkspaceRolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @WorkspaceRoles('viewer', 'editor', 'admin', 'owner')
  findAll(
    @Param() params: WorkspaceDocumentParamsDto,
    @Query() query: ListDocumentsDto,
  ) {
    return this.documents.findAll(params.workspaceId, query);
  }

  @Post()
  @WorkspaceRoles('editor', 'admin', 'owner')
  create(
    @Param() params: WorkspaceDocumentParamsDto,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documents.create(params.workspaceId, dto);
  }

  @Get(':documentId')
  @WorkspaceRoles('editor', 'viewer', 'admin', 'owner')
  findOne(@Param() params: DocumentParamsDto) {
    return this.documents.findOne(params.workspaceId, params.documentId);
  }

  @Patch(':documentId')
  @WorkspaceRoles('editor', 'admin', 'owner')
  update(@Param() params: DocumentParamsDto, @Body() dto: UpdateDocumentDto) {
    return this.documents.update(params.workspaceId, params.documentId, dto);
  }

  @Delete(':documentId')
  @WorkspaceRoles('admin', 'owner')
  remove(@Param() params: DocumentParamsDto) {
    return this.documents.remove(params.workspaceId, params.documentId);
  }
}
