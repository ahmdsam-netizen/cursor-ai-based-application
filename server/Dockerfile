FROM node:20-alpine

WORKDIR /app

# Install openssl for prisma engine on alpine
RUN apk add --no-cache openssl

# Copy package manifests
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate prisma client
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 5050

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
