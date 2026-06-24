FROM node:20-alpine

# Set environment
ARG DB_TYPE

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4050

CMD ["npm", "run" "build"]

CMD ["npm", "start"]