const DOCKER_DB = "postgresql://practix:practix@localhost:5432/practix";

process.env.DATABASE_URL = DOCKER_DB;
process.env.DIRECT_URL = DOCKER_DB;
