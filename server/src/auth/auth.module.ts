import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule as NestBetterAuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { organization } from 'better-auth/plugins';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    NestBetterAuthModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule, RedisModule],
      inject: [ConfigService, PrismaService, RedisService],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
        redisService: RedisService,
      ) => ({
        auth: (() => {
          const authUrl = configService.getOrThrow<string>('BETTER_AUTH_URL');
          const clientUrl = configService.getOrThrow<string>('CLIENT_URL');
          const trustedOrigins = (
            configService.get<string>('BETTER_AUTH_TRUSTED_ORIGINS') ??
            `${authUrl},${clientUrl}`
          )
            .split(',')
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0);
          const trustedProxyCidrs = (
            configService.get<string>('TRUSTED_PROXY_CIDRS') ?? ''
          )
            .split(',')
            .map((cidr) => cidr.trim())
            .filter((cidr) => cidr.length > 0);
          const isProduction =
            configService.get<string>('NODE_ENV') === 'production';
          const authSecret =
            configService.getOrThrow<string>('BETTER_AUTH_SECRET');

          if (
            isProduction &&
            (authSecret.length < 32 ||
              authSecret === 'replace-with-a-random-32-byte-secret')
          ) {
            throw new Error(
              'BETTER_AUTH_SECRET must be a unique random secret with at least 32 characters in production',
            );
          }

          return betterAuth({
            basePath: '/api/auth',
            baseURL: authUrl,
            secret: authSecret,
            trustedOrigins,
            rateLimit: {
              enabled: isProduction,
              window: 10,
              max: 100,
              customStorage: {
                consume: (key, rule) =>
                  redisService.consumeRateLimit(key, rule.window, rule.max),
              },
              customRules: {
                '/api/auth/sign-in/email': { window: 60, max: 5 },
                '/api/auth/sign-up/email': { window: 60, max: 5 },
              },
            },
            advanced: {
              useSecureCookies: isProduction && authUrl.startsWith('https://'),
              ipAddress: {
                ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
                trustedProxies: trustedProxyCidrs,
              },
            },
            database: prismaAdapter(prismaService, {
              provider: 'postgresql',
            }),
            emailAndPassword: {
              enabled: true,
            },
            plugins: [
              organization({
                allowUserToCreateOrganization: true,
                organizationLimit: 5,
                membershipLimit: 100,
                creatorRole: 'owner',
                disableOrganizationDeletion: true,
                schema: {
                  organization: {
                    modelName: 'workspace',
                  },
                  member: {
                    modelName: 'member',
                  },
                  invitation: {
                    modelName: 'invitation',
                  },
                },
              }),
            ],
          });
        })(),
      }),
      isGlobal: true,
    }),
  ],
})
export class AuthModule {}
