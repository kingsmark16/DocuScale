# DocuScale
DocuScale Architecture is a multi-tenant B2B SaaS document engine built with Next.js, NestJS, Prisma, and Postgres. It features stateless backend cluster scaled across 3 Docker replicas, managed by an NGINX load balancer with IP rate-limiting. Better Auth and custom Redis look-aside caching drop RBAC authorization checks to sub-millisecond speeds.
