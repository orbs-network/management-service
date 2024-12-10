build_docker_dev:
	@npm run build
	@docker tag local/management-service:latest localhost:6000/management-service:latest
	@docker push localhost:6000/management-service:latest

