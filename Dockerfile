# Campus Digital Issue & Maintenance Tracker
# Node 22 ships with an embedded SQLite (node:sqlite), so the image needs no npm dependencies.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/tracker.db \
    UPLOAD_DIR=/data/uploads

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public

# /data holds the database and uploaded photos; mount a volume here to persist it
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
