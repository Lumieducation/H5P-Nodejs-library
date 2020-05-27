FROM node:alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

RUN mkdir -p /usr/local/lib/node_modules && chown -R node:node /usr/local/lib/node_modules

WORKDIR /home/node/app

COPY . .

RUN npm install -g typescript

RUN npm install

RUN npm build

USER node

EXPOSE 8080

CMD [ "npm", "start" ]