FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY express-server.js prompt-guard.js store-credits.js ./

EXPOSE 3000

CMD ["node", "express-server.js"]
