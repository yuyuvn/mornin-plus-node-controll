#!/bin/sh
set -e

/etc/init.d/dbus start && /usr/libexec/bluetooth/bluetoothd && exec "$@"
