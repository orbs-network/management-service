#!/bin/sh +x

npm start -- $@ 2>&1 | multilog s16777215 n3 '!tai64nlocal' /opt/orbs/logs 2>&1