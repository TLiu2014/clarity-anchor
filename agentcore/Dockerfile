# AgentCore Runtime requires linux/arm64.
FROM --platform=linux/arm64 public.ecr.aws/docker/library/node:22-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

# Build.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
