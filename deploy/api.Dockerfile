FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

# Copy only the API service first (better layer caching)
COPY services/api/package.json services/api/package-lock.json* /app/services/api/
WORKDIR /app/services/api

RUN npm install --no-audit --no-fund

# Copy source
COPY services/api /app/services/api

# Prisma client
RUN npm run prisma:generate

# Build TS
RUN npm run build

EXPOSE 4000

CMD ["sh", "-lc", "npm run prisma:migrate && node dist/index.js"]
