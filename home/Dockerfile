FROM golang:1.23 AS build

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -installsuffix 'static' -o home ./...

FROM gcr.io/distroless/static

WORKDIR /app

ARG BUILDVER=dev
ARG COMMITBRANCH=development
ARG COMMITSHA

ENV GIN_MODE=release

COPY --from=build /app/home /app/
COPY --from=build /app/static/ /app/static
COPY --from=build /app/templates/ /app/templates

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT [ "/app/home" ]

LABEL version=${BUILDVER} code.branch=${COMMITBRANCH} code.commit=${COMMITSHA}
