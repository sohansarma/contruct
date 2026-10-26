# One container serves the API and the website.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Empty = the site calls the API on the same origin
ARG VITE_API_URL=""
ARG VITE_SUPPORT_PHONE
ARG VITE_SUPPORT_EMAIL
RUN VITE_API_URL="$VITE_API_URL" npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src ./src
EXPOSE 8080
USER node
CMD ["node", "server/index.js"]
