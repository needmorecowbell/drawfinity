FROM rust:1.86-slim AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src/ src/

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/drawfinity-server /usr/local/bin/drawfinity-server

EXPOSE 8080
VOLUME /data

ENV DRAWFINITY_PORT=8080
ENV DRAWFINITY_DATA_DIR=/data

ENTRYPOINT ["drawfinity-server"]
