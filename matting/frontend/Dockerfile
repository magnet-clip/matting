FROM node:lts AS builder

ENV SHELL=sh
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && pnpm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
