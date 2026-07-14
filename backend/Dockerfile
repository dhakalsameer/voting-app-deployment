FROM node:20-alpine AS builder
WORKDIR /app
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm ci --only=production && cp -r node_modules /prod_modules
RUN npm ci

FROM node:20-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=builder /prod_modules node_modules
COPY app/backend/ .
EXPOSE 5000
CMD ["node", "src/server.js"]
