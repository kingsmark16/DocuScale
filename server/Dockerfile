FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN DATABASE_URL=postgresql://docuscale:docuscale@localhost:5432/docuscale \
    npx prisma generate

RUN npm run build


FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated

USER node

EXPOSE 3000

CMD ["node", "dist/src/main.js"]