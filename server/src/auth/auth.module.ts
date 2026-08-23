import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule as NestBetterAuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma/prisma.service';

@Module({
  imports: [
    DatabaseModule,
    NestBetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule],
      inject: [ConfigService, PrismaService],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
      ) => ({
        auth: betterAuth({
          basePath: '/api/auth',
          baseURL: configService.getOrThrow<string>('BETTER_AUTH_URL'),
          secret: configService.getOrThrow<string>('BETTER_AUTH_SECRET'),
          trustedOrigins: [
            configService.getOrThrow<string>('BETTER_AUTH_URL'),
            configService.getOrThrow<string>('CLIENT_URL'),
          ],
          database: prismaAdapter(prismaService, {
            provider: 'postgresql',
          }),
          emailAndPassword: {
            enabled: true,
          },
        }),
      }),
      isGlobal: true,
    }),
  ],
})
export class AuthModule {}
