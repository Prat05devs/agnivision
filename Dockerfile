FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev && npm cache clean --force

COPY api ./api
COPY server ./server
COPY src ./src
COPY tsconfig.json ./tsconfig.json

USER node
EXPOSE 8080

CMD ["npm", "run", "server:start"]
