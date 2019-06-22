FROM node:alpine
MAINTAINER drpaulbrewer@eaftc.com
RUN apk add git && \
    cd /home/node && \
    git clone https://github.com/drpaulbrewer/single-market-robot-simulator/ && \
    apk del git && \
    chown -R node:node /home/node
USER node
WORKDIR /home/node
RUN cd ./single-market-robot-simulator && \
    npm i -D && \
    npm audit fix
WORKDIR /work
CMD ["node","/home/node/single-market-robot-simulator/build/index.js","/work/sim.json"]
