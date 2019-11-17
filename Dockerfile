# Set the default architecture of Node to use to "amd64".
ARG TARGET_ARCH=amd64

# 1st build stage: Install NPM dependencies.

# Set the base image to the official Node image, for the architecture that this image is being built
# on. This isn't using the Alpine Node image because only "amd64" is provided.
FROM node as install-dependencies
# Set the working directory to an app dependency directory in the read only source code directory.
WORKDIR /usr/src/app-deps
# Copy the package metadata and package manifest to the working directory.
COPY package.json package-lock.json ./
# Install the Node.js dependencies with NPM.
RUN npm i

# 2nd build stage: Install the app.

# Set the base image to the official Node image for the architecture that this image is being built
# for.
FROM ${TARGET_ARCH}/node as install-app
# Set the working directory to an app directory in the read only source code directory.
WORKDIR /usr/src/app
# Copy the app dependencies to the working directory.
COPY --from=install-dependencies /usr/src/app-deps ./
# Copy the package metadata, app source code, and environment JSON to the working directory.
COPY package.json Server.js env.json ./
# Configure the container to start the server when ran.
ENTRYPOINT ["npm", "run", "start"]