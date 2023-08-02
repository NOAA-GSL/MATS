FROM golang:1.20 AS build

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -installsuffix 'static' -o home ./...

FROM gcr.io/distroless/static

WORKDIR /app

COPY --from=build /app/home /app/
COPY --from=build /app/static/ /app/static
COPY --from=build /app/templates/ /app/templates

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT [ "/app/home" ]
