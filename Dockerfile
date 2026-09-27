FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_ENABLE_DEMO=true
ARG VITE_CITY_OPTIONS=[]
ARG VITE_CINEMA_TIMEZONE=Asia/Kolkata
ENV VITE_ENABLE_DEMO=$VITE_ENABLE_DEMO VITE_CITY_OPTIONS=$VITE_CITY_OPTIONS VITE_CINEMA_TIMEZONE=$VITE_CINEMA_TIMEZONE
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server.mjs ./
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
