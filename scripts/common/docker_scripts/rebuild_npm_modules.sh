#!/bin/sh

export PYTHONPATH=/usr/lib/python2.7
export GYP_DEFINES="linux_use_gold_flags=0"

BINARY_MODULES=$(find /bundle -name 'binding\.gyp' -exec dirname {} \; | grep -v fibers)

for BINARY_MODULE in $BINARY_MODULES; do
    cd $BINARY_MODULE
    node-gyp rebuild
done