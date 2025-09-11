import type { ClickHouseConnection } from "@observability/clickhouse";
import fastify from "fastify";
import { closeClickHouse, getClickHouseClient } from "./clickhouse";
import { env } from "./env";
import { eventsRoutes } from "./routes/events";

declare module "fastify" {
	interface FastifyInstance {
		clickhouse: ClickHouseConnection;
	}
}

const server = fastify({
	logger: {
		level: env.LOG_LEVEL,
		transport:
			env.NODE_ENV === "development"
				? {
						target: "pino-pretty",
						options: {
							translateTime: "HH:MM:ss Z",
							ignore: "pid,hostname",
						},
					}
				: undefined,
	},
});

server.get("/", async () => {
	return { hello: "world" };
});

server.get("/health", async () => {
	return {
		status: "ok",
		timestamp: new Date().toISOString(),
		environment: env.NODE_ENV,
	};
});

// Add ClickHouse client to server context
server.decorate("clickhouse", getClickHouseClient());

// Register event routes
server.register(eventsRoutes);

const start = async () => {
	try {
		await server.listen({
			port: env.PORT,
			host: env.HOST,
		});

		server.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

// Graceful shutdown
process.on("SIGTERM", async () => {
	server.log.info("SIGTERM received, shutting down gracefully");
	await server.close();
	await closeClickHouse();
	process.exit(0);
});

process.on("SIGINT", async () => {
	server.log.info("SIGINT received, shutting down gracefully");
	await server.close();
	await closeClickHouse();
	process.exit(0);
});

start();
