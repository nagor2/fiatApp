FROM gitlab.demlabs.net:5050/sources/registry/node:20-alpine as builder

ARG REACT_APP_ETHERSCAN_API_KEY
ARG REACT_APP_WALLETCONNECT_PROJECT_ID
ENV REACT_APP_ETHERSCAN_API_KEY=$REACT_APP_ETHERSCAN_API_KEY
ENV REACT_APP_WALLETCONNECT_PROJECT_ID=$REACT_APP_WALLETCONNECT_PROJECT_ID

WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM gitlab.demlabs.net:5050/sources/registry/nginx:alpine3.18 as production-stage

WORKDIR /app
COPY --from=builder /app/build /app
COPY ./nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
