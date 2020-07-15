FROM rust:1-alpine3.12 as builder
WORKDIR /app
COPY . /app
RUN apk add --no-cache musl-dev && cargo build --release

FROM alpine:3.7
WORKDIR /app
COPY static /app

COPY --from=builder /app/target/release/friendly_file_server_rust /app
EXPOSE 5000
CMD [ \
        "friendly_file_server_rust"\
        ,"--sharedir"\
        ,"/var/share"\
        ,"--ipaddr"\
        ,"0.0.0.0"\
        ,"--credsfile"\
        ,"/app/credentials"\
        ,"--port"\
        ,"5000"\
    ]