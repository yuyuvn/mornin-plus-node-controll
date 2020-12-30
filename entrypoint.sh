#!/bin/sh
set -e

service dbus start
bluetoothd & exec "$@"
