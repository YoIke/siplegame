# Railway用Dockerfile
FROM node:18-alpine

WORKDIR /app

# package.json をコピーして依存関係をインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY . .

# ポートを公開
EXPOSE 3000

# アプリケーション開始
CMD ["npm", "start"]
