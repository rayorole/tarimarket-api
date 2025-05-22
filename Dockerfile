FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# Get the grpc wallet url from the environment variable
ARG GRPC_WALLET_URL
ENV GRPC_WALLET_URL=${GRPC_WALLET_URL}

# Get the port from the environment variable
ARG PORT
ENV PORT=${PORT}

RUN npm run build

CMD ["node", "dist/index.js"]

EXPOSE ${PORT}

# How to build the docker image
# docker build -t rest-api --build-arg GRPC_WALLET_URL="127.0.0.1:18143" --build-arg PORT="5000" .

# How to run the docker image
# docker run -p 5000:5000 rest-api


