import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaService } from './../src/database/prisma/prisma.service';

type AuthResponse = {
  user: {
    email: string;
  };
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
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
});
