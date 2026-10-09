FROM --platform=$BUILDPLATFORM oven/bun:1.4.2-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS build
ARG TARGETARCH
WORKDIR /app
COPY src ./src
RUN bun build ./src/server.ts --compile --minify \
      --target "bun-linux-$([ "$TARGETARCH" = arm64 ] && echo arm64 || echo x64-baseline)" \
      --outfile /server

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f
COPY --from=build /server /server
EXPOSE 3000
ENTRYPOINT ["/server"]
