# Single production image: builds the React client and the TypeScript server,
# then runs the server which also serves the built client. One container, one
# origin, which is exactly what Coolify wants to deploy.
#
# Playwright is a leftover dependency from the abandoned Google-scraping
# attempt (server/scraping/serp-google.ts, imported by nothing). Skipping its
# browser download keeps the image small and the build fast.

# ---- build stage ----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Server deps
COPY package*.json ./
RUN npm ci

# Client deps
COPY client/package*.json ./client/
RUN npm --prefix client ci

# Sources
COPY tsconfig.json ./
COPY server ./server
COPY client ./client

# Compile server (tsc -> dist/) and build client (vite -> client/dist/)
RUN npm run build
RUN npm --prefix client run build

# ---- runtime stage --------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled server, built client, and the Knowledge Library the writer reads
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist
COPY data/knowledge ./data/knowledge

EXPOSE 3000
# Coolify polls this to know the container is healthy. /api/health returns 200
# even if the DB is briefly unreachable, so a DB blip doesn't fail the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "./dist/instrument.js", "dist/index.js"]
