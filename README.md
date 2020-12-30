# mornin-plus-node-control
Node control mornin' plus

# Raspbian
```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

# Usage
1. Set enviroment variable (change token value to your token)
```sh
export CHICKEN_TOKEN="1234a5671234074cd3c0000c46c960a7"
```

## Run service
```sh
node index.js
```

## Add metrics to prometheus
```yaml
    - job_name: curtain
    scrape_interval: 10m
    scrape_timeout: 10s
    static_configs:
      - targets: ['localhost:5322']
```
# Supported command
To execuse command, make a http request to endpoints:
```
POST /act/<command> application/json {"token": "YOUR_TOKEN"}
```

* open
* close
* stop
* hightSpeedOpen
* hightSpeedClose

# TODO
- [ ] Test code
- [ ] Support multidevices

# Export yarn.lock
```bash
docker build . -t mornin:latest
docker create -ti --name dummy mornin:latest bash
docker cp dummy:/app/yarn.lock ./yarn.lock
docker rm -f dummy
```

# Docker build
```bash
make build
```

# Run docker
```bash
docker run -d --net=host --privileged -e CHICKEN_TOKEN=TOKEN clicia/mornin:latest
```
