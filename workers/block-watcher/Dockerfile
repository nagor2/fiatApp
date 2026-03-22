FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --omit=dev

# Копируем исходники
COPY . .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${HEALTH_BROADCAST_PORT:-3002}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Запуск воркера
CMD ["npm", "start"]
