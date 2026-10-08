#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
build_dir="${TMPDIR:-/tmp}/rock-saw-firmware-tests"
mkdir -p "$build_dir"
g++ -std=c++17 -Wall -Wextra -Wpedantic -Werror -g -fsanitize=address,undefined -fno-omit-frame-pointer -I firmware/RockSawWaterControl firmware/tests/controller_test.cpp -o "$build_dir/controller-test"
"$build_dir/controller-test"
