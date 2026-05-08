FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends flex bison gcc libc6-dev make libfl-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 7000
CMD ["npm", "start"]
