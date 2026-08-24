import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaService } from './../src/database/prisma/prisma.service';
import { configureApp } from './../src/app-config';

type AuthResponse = {
  user: {
    id: string;
    email: string;
  };
};

type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
};

type FullOrganizationResponse = {
  id: string;
  members: Array<{
    role: string;
  }>;
};

type DocumentResponse = {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  workspaceId: string;
};
type DocumentListResponse = {
  data: Array<{
    id: string;
    title: string;
    isPublished: boolean;
    workspaceId: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      database: 'up',
      redis: 'up',
    });
  });
  it('/api/auth/ok (GET)', () => {
    return request(app.getHttpServer()).get('/api/auth/ok').expect(200);
  });
  it('/api/auth email flow', async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'StrongPassword123!';
    let userCreated = false;

    try {
      const signUpResponse = await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          name: 'E2E User',
          email,
          password,
        })
        .expect(200);

      userCreated = true;

      const signUpBody = signUpResponse.body as unknown as AuthResponse;
      expect(signUpBody.user.email).toBe(email);
      expect(signUpResponse.headers['set-cookie']).toBeDefined();

      const signInResponse = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({
          email,
          password,
        })
        .expect(200);

      const signInBody = signInResponse.body as unknown as AuthResponse;
      expect(signInBody.user.email).toBe(email);
      expect(signInResponse.headers['set-cookie']).toBeDefined();
    } finally {
      if (userCreated) {
        await app.get(PrismaService).user.delete({
          where: { email },
        });
      }
    }
  });
  it('/api/auth organization flow', async () => {
    const email = `organization-e2e-${Date.now()}@example.com`;
    const password = 'StrongPassword123!';
    const slug = `e2e-workspace-${Date.now()}`;
    const client = request.agent(app.getHttpServer());
    let userCreated = false;
    let workspaceId: string | undefined;
    const outsiderEmail = `outsider-${Date.now()}@example.com`;
    const outsiderClient = request.agent(app.getHttpServer());
    let outsiderCreated = false;

    try {
      const signUpResponse = await client
        .post('/api/auth/sign-up/email')
        .send({
          name: 'Organization E2E User',
          email,
          password,
        })
        .expect(200);

      userCreated = true;

      const signUpBody = signUpResponse.body as unknown as AuthResponse;
      expect(signUpBody.user.email).toBe(email);

      const createOrganizationResponse = await client
        .post('/api/auth/organization/create')
        .send({
          name: 'E2E Workspace',
          slug,
        })
        .expect(200);

      const organization =
        createOrganizationResponse.body as unknown as OrganizationResponse;

      workspaceId = organization.id;

      expect(organization.name).toBe('E2E Workspace');
      expect(organization.slug).toBe(slug);

      const fullOrganizationResponse = await client
        .get('/api/auth/organization/get-full-organization')
        .query({ organizationId: workspaceId })
        .expect(200);

      const fullOrganization =
        fullOrganizationResponse.body as unknown as FullOrganizationResponse;

      expect(fullOrganization.id).toBe(workspaceId);
      expect(fullOrganization.members).toHaveLength(1);
      expect(fullOrganization.members[0].role).toBe('owner');

      await client
        .post('/api/auth/organization/set-active')
        .send({ organizationId: workspaceId })
        .expect(200);

      const session = await app.get(PrismaService).session.findFirst({
        where: { userId: signUpBody.user.id },
      });

      expect(session?.activeOrganizationId).toBe(workspaceId);

      const accessResponse = await client
        .get(`/api/w/${workspaceId}/access`)
        .expect(200);

      expect(accessResponse.body).toEqual({
        workspaceId,
        role: 'owner',
      });

      const outsiderSignUpResponse = await outsiderClient
        .post('/api/auth/sign-up/email')
        .send({
          name: 'Outsider User',
          email: outsiderEmail,
          password: 'OutsiderPassword123!',
        })
        .expect(200);

      const outsiderSignUpBody =
        outsiderSignUpResponse.body as unknown as AuthResponse;

      expect(outsiderSignUpBody.user.email).toBe(outsiderEmail);
      outsiderCreated = true;

      await outsiderClient.get(`/api/w/${workspaceId}/access`).expect(403);
    } finally {
      const prisma = app.get(PrismaService);

      if (workspaceId) {
        await prisma.workspace.delete({
          where: { id: workspaceId },
        });
      }

      if (userCreated) {
        await prisma.user.delete({
          where: { email },
        });
      }
      if (outsiderCreated) {
        await prisma.user.delete({
          where: { email: outsiderEmail },
        });
      }
    }
  });
  it('/api/w/:workspaceId/docs CRUD flow', async () => {
    const email = `documents-e2e-${Date.now()}@example.com`;
    const password = 'StrongPassword123!';
    const slug = `documents-workspace-${Date.now()}`;
    const client = request.agent(app.getHttpServer());

    let userCreated = false;
    let workspaceId: string | undefined;

    try {
      const signUpResponse = await client
        .post('/api/auth/sign-up/email')
        .send({
          name: 'Documents E2E User',
          email,
          password,
        })
        .expect(200);

      userCreated = true;

      const signUpBody = signUpResponse.body as unknown as AuthResponse;
      expect(signUpBody.user.email).toBe(email);

      const organizationResponse = await client
        .post('/api/auth/organization/create')
        .send({
          name: 'Documents E2E Workspace',
          slug,
        })
        .expect(200);

      const organization =
        organizationResponse.body as unknown as OrganizationResponse;

      workspaceId = organization.id;

      const otherWorkspaceId = '00000000-0000-4000-8000-000000000000';

      await client.get(`/api/w/${otherWorkspaceId}/docs`).expect(403);

      const createResponse = await client
        .post(`/api/w/${workspaceId}/docs`)
        .send({
          title: 'First document',
          content: 'Initial document content',
          isPublished: false,
        })
        .expect(201);

      const createdDocument =
        createResponse.body as unknown as DocumentResponse;

      expect(createdDocument.title).toBe('First document');
      expect(createdDocument.workspaceId).toBe(workspaceId);

      const secondCreateResponse = await client
        .post(`/api/w/${workspaceId}/docs`)
        .send({
          title: 'Second document',
          content: 'Another document for pagination',
          isPublished: false,
        })
        .expect(201);

      const secondDocument =
        secondCreateResponse.body as unknown as DocumentResponse;

      expect(secondDocument.id).not.toBe(createdDocument.id);

      const listResponse = await client
        .get(`/api/w/${workspaceId}/docs`)
        .expect(200);

      const documentList = listResponse.body as unknown as DocumentListResponse;

      expect(documentList.data).toHaveLength(2);

      const firstPageResponse = await client
        .get(`/api/w/${workspaceId}/docs`)
        .query({ limit: 1 })
        .expect(200);

      const firstPage =
        firstPageResponse.body as unknown as DocumentListResponse;

      expect(firstPage.data).toHaveLength(1);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.pageInfo.nextCursor).not.toBeNull();

      const secondPageResponse = await client
        .get(`/api/w/${workspaceId}/docs`)
        .query({
          limit: 1,
          cursor: firstPage.pageInfo.nextCursor,
        })
        .expect(200);

      const secondPage =
        secondPageResponse.body as unknown as DocumentListResponse;

      expect(secondPage.data).toHaveLength(1);
      expect(secondPage.data[0].id).not.toBe(firstPage.data[0].id);
      expect(secondPage.pageInfo.hasNextPage).toBe(false);

      const getResponse = await client
        .get(`/api/w/${workspaceId}/docs/${createdDocument.id}`)
        .expect(200);

      const fetchedDocument = getResponse.body as unknown as DocumentResponse;

      expect(fetchedDocument.content).toBe('Initial document content');

      const updateResponse = await client
        .patch(`/api/w/${workspaceId}/docs/${createdDocument.id}`)
        .send({
          title: 'Updated document',
          content: 'Updated document content',
          isPublished: true,
        })
        .expect(200);

      const updatedDocument =
        updateResponse.body as unknown as DocumentResponse;

      expect(updatedDocument.title).toBe('Updated document');
      expect(updatedDocument.isPublished).toBe(true);

      const searchResponse = await client
        .get(`/api/w/${workspaceId}/docs`)
        .query({ search: 'UPDATED' })
        .expect(200);

      const searchResults =
        searchResponse.body as unknown as DocumentListResponse;

      expect(searchResults.data).toHaveLength(1);
      expect(searchResults.data[0].id).toBe(createdDocument.id);

      await client
        .post(`/api/w/${workspaceId}/docs`)
        .send({
          title: 'Valid title',
          content: 'Valid content',
          unexpectedField: true,
        })
        .expect(400);

      await client
        .delete(`/api/w/${workspaceId}/docs/${createdDocument.id}`)
        .expect(200);

      await client
        .get(`/api/w/${workspaceId}/docs/${createdDocument.id}`)
        .expect(404);
    } finally {
      const prisma = app.get(PrismaService);

      if (workspaceId) {
        await prisma.workspace.delete({
          where: { id: workspaceId },
        });
      }

      if (userCreated) {
        await prisma.user.delete({
          where: { email },
        });
      }
    }
  });
});
