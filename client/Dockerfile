# Stage 1: Build the project
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve the dist folder
FROM node:18-alpine AS runner

WORKDIR /app
RUN npm install -g serve
COPY --from=builder /build/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
