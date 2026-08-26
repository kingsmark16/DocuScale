import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configureApp(
  app: INestApplication,
  clientUrls = process.env.CLIENT_URL ?? 'http://localhost:3001',
): void {
  const allowedOrigins = clientUrls
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}
