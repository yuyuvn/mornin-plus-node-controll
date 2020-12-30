FROM node:lts

RUN apt-get update && apt-get install -y bluez bluetooth

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn

COPY . .

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "index.js"]
