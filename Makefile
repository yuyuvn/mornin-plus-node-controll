.PHONY: build
build:
	DOCKER_BUILDKIT=1 \
		docker build -t clicia/mornin:latest --platform linux/arm/v7 --progress=plain .

.PHONY: push
push:
	docker push clicia/mornin:latest
