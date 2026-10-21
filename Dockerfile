# Multi-stage Dockerfile to build and package both frontend and backend
# Stage 1: Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build server and runtime
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

# Prisma setup
COPY server/prisma ./server/prisma/
RUN cd server && npx prisma generate

# Copy server code
COPY server/tsconfig.json ./server/
COPY server/src ./server/src/
COPY server/docker-entrypoint.sh ./server/
RUN chmod +x ./server/docker-entrypoint.sh

# Copy built frontend assets to client/dist
COPY --from=client-builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 5050

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
