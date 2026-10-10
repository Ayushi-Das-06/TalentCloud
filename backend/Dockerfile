FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/talentcloud
RUN npx prisma generate --schema prisma/schema.postgres.prisma && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma/schema.postgres.prisma ./prisma/schema.postgres.prisma
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]
