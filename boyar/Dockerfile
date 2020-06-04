FROM local/management-service

COPY ./service ./
COPY ./healthcheck ./
COPY ./healthcheck.js ./
HEALTHCHECK CMD /opt/orbs/healthcheck
