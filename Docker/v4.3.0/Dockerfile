FROM node:8-alpine
MAINTAINER drpaulbrewer@eaftc.com
RUN apk add git && \
    cd /home/node && \
    git clone https://github.com/drpaulbrewer/single-market-robot-simulator/ && \
    cd ./single-market-robot-simulator && \
    git checkout 6c808424 && \
    apk del git && \
    chown -R node:node /home/node
USER node
WORKDIR /home/node
RUN cd ./single-market-robot-simulator && \
    npm i mocha@5.1.0 -D && \
    npm i market-agents@3.0.5 -S && \
    npm i market-example-contingent@1.0.2 -S && \
    npm i positive-number-array@1.2.2 -S && \
    npm i simple-isomorphic-logger@2.0.1 -S && \
    npm i stats-lite@2.1.0 -S && \
    npm i -D
WORKDIR /work
CMD ["node","/home/node/single-market-robot-simulator/build/index.js","/work/sim.json"]

    
