FROM node:lts

RUN mkdir -p /opt/h5p
WORKDIR /opt/h5p

COPY . ./

RUN npm install
RUN npm run download:content-type-cache
RUN npm run download:content
RUN npm run download:core
RUN npm run build

EXPOSE 8080
CMD [ "npm", "start" ]
