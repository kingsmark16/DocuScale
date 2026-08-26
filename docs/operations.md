# DocuScale operations runbook

## Local environment

Copy the example environment file and replace the placeholder secret. Generate a secret with Node.js:

```powershell
Copy-Item .env.example .env
$authSecret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
$authSecret
```

Copy the printed value into `.env` as `BETTER_AUTH_SECRET`. Never commit `.env` or paste its contents into an issue.

Start the production-shaped local stack with three API replicas:

```powershell
docker compose -f docker-compose.yaml -f docker-compose.production.yaml up -d --build --scale api=3
docker compose -f docker-compose.yaml -f docker-compose.production.yaml ps
```

The public local API is exposed through NGINX at `http://localhost:8080`.

## Health and load verification

Check the API, then send concurrent requests through NGINX:

```powershell
Invoke-RestMethod http://localhost:8080/health
.\scripts\load-test.ps1 -Url http://localhost:8080/health -Requests 100 -Concurrency 10
```

Confirm that all replicas receive traffic:

```powershell
docker compose -f docker-compose.yaml -f docker-compose.production.yaml logs nginx --tail 100
```

Look for multiple `upstream=` addresses in the access log. Validate the NGINX configuration inside the Compose network:

```powershell
docker compose -f docker-compose.yaml -f docker-compose.production.yaml exec nginx nginx -t
```

## Database migrations

Create migrations during development with Prisma, commit the migration directory, and apply committed migrations in the deployment environment with `prisma migrate deploy`. Do not use `prisma db push` for production data.

Before a deployment, verify the migration status against the target `DATABASE_URL`:

```powershell
$env:DATABASE_URL = 'postgresql://user:password@host:5432/docuscale?schema=public'
npm --prefix server exec prisma migrate status
npm --prefix server exec prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

## Security expectations

- `BETTER_AUTH_SECRET` must be unique, random, and at least 32 characters in production.
- Set `BETTER_AUTH_URL` and `CLIENT_URL` to the real HTTPS origins in production.
- Keep `BETTER_AUTH_TRUSTED_ORIGINS` limited to known application origins.
- Keep `TRUSTED_PROXY_CIDRS` limited to the reverse-proxy network ranges.
- Do not expose PostgreSQL or Redis publicly.
- Keep the NGINX and Better Auth rate limits enabled in production.

## Verification before pushing a change

```powershell
docker compose -f docker-compose.yaml -f docker-compose.production.yaml exec nginx nginx -t
npm --prefix server run format
npm --prefix server run lint
npm --prefix server run build
npm --prefix server test -- --runInBand
npm --prefix server run test:e2e -- --runInBand --detectOpenHandles
npm --prefix client run lint
npm --prefix client run build
git diff --check
```
