FROM node:lts

WORKDIR /app 

RUN yarn global add nodemon


CMD ["npm", "run", "dev"]