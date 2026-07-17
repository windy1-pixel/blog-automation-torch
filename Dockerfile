# Multi-stage build: compile TypeScript in one stage, run the compiled
# JavaScript in a slim final image — keeps the deployed image small and
# leaves dev tools (typescript, tsx) out of production.

FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server ./server
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 3000
# Coolify polls this to know the container is healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
