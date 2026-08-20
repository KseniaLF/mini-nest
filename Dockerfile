FROM node:22-slim AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci


FROM dependencies AS test

COPY tsconfig.json ./
COPY src ./src
COPY test ./test

RUN chown -R node:node /app

USER node

CMD ["npm", "test"]