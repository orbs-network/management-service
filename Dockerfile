FROM node:12-alpine
# Env
ENV NODE_ENV production
# Set the timezone in docker
# Create Directory for the Container
WORKDIR /opt/orbs
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY dist ./dist

COPY service .

# Start
CMD [ "npm", "start" ]
EXPOSE 7666
