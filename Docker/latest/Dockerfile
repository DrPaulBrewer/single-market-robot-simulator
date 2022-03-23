FROM node:alpine
MAINTAINER drpaulbrewer@eaftc.com
COPY . /home/node/single-market-robot-simulator/
RUN chown -R node:node /home/node
USER node
WORKDIR /home/node
RUN cd ./single-market-robot-simulator && \
    npm install && \
    npm audit fix
WORKDIR /work
CMD ["node","/home/node/single-market-robot-simulator/src/bin.cjs","/work/sim.json"]
