FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.cjs printer-server.cjs ./

EXPOSE 4242 4243
