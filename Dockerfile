FROM node:20-alpine

# Set environment
ARG DB_TYPE

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4050

CMD ["npm", "start"]