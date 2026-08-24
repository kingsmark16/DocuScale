import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const documentListSelect = {
  id: true,
  title: true,
  isPublished: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        workspaceId,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished,
      },
    });
  }

  async findAll(workspaceId: string, query: ListDocumentsDto) {
    const where = {
      workspaceId,
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                content: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const records = await this.prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      skip: query.cursor ? 1 : undefined,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      select: documentListSelect,
    });

    const hasNextPage = records.length > query.limit;
    const data = hasNextPage ? records.slice(0, query.limit) : records;

    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
      },
    };
  }

  async findOne(workspaceId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(
    workspaceId: string,
    documentId: string,
    dto: UpdateDocumentDto,
  ) {
    await this.findOne(workspaceId, documentId);

    return this.prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isPublished !== undefined
          ? { isPublished: dto.isPublished }
          : {}),
      },
    });
  }

  async remove(workspaceId: string, documentId: string) {
    await this.findOne(workspaceId, documentId);

    await this.prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    return {
      deleted: true,
      id: documentId,
    };
  }
}
