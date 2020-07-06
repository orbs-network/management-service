#!/bin/sh +x

npm start $@ | multilog t s16777215 n3 '!tai64nlocal' /opt/orbs/logs 2>&1