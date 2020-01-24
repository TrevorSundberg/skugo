FROM node:12-alpine

WORKDIR /opt/app

COPY bin ./bin/
COPY package.json .
COPY package-lock.json .

RUN npm install

CMD npm start
