build_docker_dev:
	@npm run build
	@docker tag local/management-service:latest localhost:6000/management-service:latest
	@docker push localhost:6000/management-service:latest

build_x86:
	@npm run buildonly && \
	./boyar/create-version-file.sh && docker buildx build --platform linux/x86_64 -t local/management-service-x86_64 . && \
	CURRENT_TIMESTAMP=`date +%s` && \
	echo Image: orbsnetworkstaging/management-service:$$CURRENT_TIMESTAMP && \
	docker tag local/management-service-x86_64:latest orbsnetworkstaging/management-service:$$CURRENT_TIMESTAMP && \
	docker push orbsnetworkstaging/management-service:$$CURRENT_TIMESTAMP

