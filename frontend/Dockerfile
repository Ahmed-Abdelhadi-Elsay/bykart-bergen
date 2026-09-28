FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .

FROM base AS runtime
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
