import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class WorkspaceDocumentParamsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  workspaceId!: string;
}

export class DocumentParamsDto extends WorkspaceDocumentParamsDto {
  @IsUUID()
  documentId!: string;
}
