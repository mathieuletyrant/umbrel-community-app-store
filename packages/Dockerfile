FROM --platform=$BUILDPLATFORM oven/bun:1.4.3-slim@sha256:14a223fa35747ec728bce300ef85888bc5f7958164d15bbba6a54b22b52a3288 AS build
ARG PACKAGE
ARG TARGETARCH
WORKDIR /app
COPY package.json bun.lock ./
COPY core/package.json core/
COPY widgets/package.json widgets/
COPY vitals/package.json vitals/
RUN bun install --frozen-lockfile --production
COPY core/src core/src
COPY ${PACKAGE}/src ${PACKAGE}/src
RUN bun build ./${PACKAGE}/src/server.ts --compile --minify \
      --target "bun-linux-$([ "$TARGETARCH" = arm64 ] && echo arm64 || echo x64-baseline)" \
      --outfile /server

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f
COPY --from=build /server /server
EXPOSE 3000
ENTRYPOINT ["/server"]
