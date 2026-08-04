FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy root config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/web ./apps/web

# Install build dependencies for native modules (e.g. better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the web app and its dependencies using turbo
RUN pnpm turbo run build --filter=@chapter/web

# Production stage using Nginx
FROM nginx:alpine

# Copy custom nginx config if necessary (using default for now, but enabling SPA fallback)
# Create a basic nginx.conf that forwards missing files to index.html for React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
