# mornin-plus-node-control
Node control mornin' plus

# Raspbian
```
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

# Usage
## Get token
### Get token from android log via abd
1. Download adb from https://developer.android.com/studio/releases/platform-tools.html

2. Run logcat
```sh
adb logcat > log.txt
```

3. Find from log something like (your token will have different value)
```
Write Encrypted Main Token: <1234a567 1234074c d3c0000c 46c960a7>
```

4. Set enviroment variable (change token value to your token)
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
docker buildx create --use --name mornin
docker buildx build . --platform linux/amd64,linux/arm64,linux/arm/v7 -t clicia/mornin:latest
docker buildx rm mornin
```

# Run docker
```bash
killall -9 bluetoothd
docker run --net=host --privileged -p 5322 -e CHICKEN_TOKEN=TOKEN clicia/mornin:latest
```
