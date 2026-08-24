import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RedisService } from '../redis/redis.service';

const DOCUMENT_CACHE_TTL_SECONDS = 60;

const documentListSelect = {
  id: true,
  title: true,
  isPublished: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type DocumentListResult = {
  data: Array<{
    id: string;
    title: string;
    isPublished: boolean;
    workspaceId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

const documentListVersionKey = (workspaceId: string) =>
  `documents:${workspaceId}:list-version`;

const documentListCacheKey = (
  workspaceId: string,
  version: string,
  query: ListDocumentsDto,
) =>
  `documents:${workspaceId}:list:${version}:${JSON.stringify({
    search: query.search ?? null,
    cursor: query.cursor ?? null,
    limit: query.limit,
  })}`;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(workspaceId: string, dto: CreateDocumentDto) {
    const document = await this.prisma.document.create({
      data: {
        workspaceId,
        title: dto.title,
        content: dto.content,
        isPublished: dto.isPublished,
      },
    });

    await this.invalidateListCache(workspaceId);

    return document;
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

    const version =
      (await this.redis.get(documentListVersionKey(workspaceId))) ?? '0';
    const cacheKey = documentListCacheKey(workspaceId, version, query);
    const cached = await this.redis.get(cacheKey);

    if (cached !== null) {
      try {
        return JSON.parse(cached) as unknown as DocumentListResult;
      } catch {
        await this.redis.del(cacheKey);
      }
    }

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

    const result: DocumentListResult = {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
      },
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      DOCUMENT_CACHE_TTL_SECONDS,
    );

    return result;
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

    const document = await this.prisma.document.update({
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

    await this.invalidateListCache(workspaceId);

    return document;
  }

  async remove(workspaceId: string, documentId: string) {
    await this.findOne(workspaceId, documentId);

    await this.prisma.document.delete({
      where: {
        id: documentId,
      },
    });
    await this.invalidateListCache(workspaceId);
    return {
      deleted: true,
      id: documentId,
    };
  }

  private async invalidateListCache(workspaceId: string): Promise<void> {
    await this.redis.incr(documentListVersionKey(workspaceId));
  }
}
