# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Build configuration
ARG VITE_ENV=production

# Umami analytics configuration (passed as build args)
ARG VITE_UMAMI_ENABLED=false
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_SCRIPT_URL

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g npm@11
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config and built assets
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
