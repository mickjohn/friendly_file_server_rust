FROM rust:1-alpine3.12 as builder
WORKDIR /app
COPY . /app
RUN apk add --no-cache musl-dev && cargo build --release

FROM alpine:3.7
WORKDIR /app
COPY . /app
COPY --from=builder /app/target/release/friendly_file_server_rust /app
EXPOSE 5000
CMD [ \
        "friendly_file_server_rust"\
        ,"--sharedir"\
        ,"/app/test"\
        ,"--ipaddr"\
        ,"0.0.0.0"\
    ]