FROM node:12-alpine

WORKDIR /opt/app

COPY package.json .
COPY package-lock.json .

RUN npm install --production --no-optional --no-progress --no-audit

COPY bin ./bin/

CMD npm start
