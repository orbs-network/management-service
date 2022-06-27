docker pull orbsnetworkstaging/management-service:v2.1.2-0a399120
docker tag  orbsnetworkstaging/management-service:v2.1.2-0a399120 orbsnetworkstaging/management-service:v100.5.0-immediate
docker push orbsnetworkstaging/management-service:v100.5.0-immediate

docker pull orbsnetworkstaging/management-service:v2.1.2-a0916e34
docker tag  orbsnetworkstaging/management-service:v2.1.2-a0916e34 orbsnetworkstaging/management-service:v100.5.1-immediate
docker push orbsnetworkstaging/management-service:v100.5.1-immediate

docker pull kornkitti/express-hello-world
docker tag  kornkitti/express-hello-world orbsnetworkstaging/express-hello-world:v1.0.0-immediate
docker push orbsnetworkstaging/express-hello-world:v1.0.0-immediate

#### deddy

docker pull orbsnetworkstaging/management-service:v2.1.2-37f0dae5
docker tag  orbsnetworkstaging/management-service:v2.1.2-37f0dae5 orbsnetworkstaging/management-service:v100.5.0-immediate
docker push orbsnetworkstaging/management-service:v100.5.0-immediate

# odnp + keepers
docker pull orbsnetworkstaging/management-service:v2.1.2-6dbcab18
docker tag  orbsnetworkstaging/management-service:v2.1.2-6dbcab18 orbsnetworkstaging/management-service:v100.5.1-immediate 
docker push orbsnetworkstaging/management-service:v100.5.1-immediate 

# merge and rename
docker pull orbsnetworkstaging/management-service:v2.1.2-eae055a5
docker tag  orbsnetworkstaging/management-service:v2.1.2-eae055a5 orbsnetworkstaging/management-service:v100.6.0-immediate
docker push orbsnetworkstaging/management-service:v100.6.0-immediate


# weights and VM notifications and keepers v2.2.0
# also - v2.1.2-dae32c32 == experimental
docker pull orbsnetworkstaging/management-service:experimental
docker tag  orbsnetworkstaging/management-service:experimental orbsnetworkstaging/management-service:v100.6.1-immediate
docker push orbsnetworkstaging/management-service:v100.6.1-immediate



