import {
	type ClickHouseClient,
	createClient,
	type DataFormat,
} from "@clickhouse/client";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export interface ClickHouseConfig {
	url?: string;
	username?: string;
	password?: string;
	database?: string;
	requestTimeout?: number;
	maxOpenConnections?: number;
	compression?: {
		request?: boolean;
		response?: boolean;
	};
}

class ClickHouseConnection {
	private client: ClickHouseClient;
	private config: ClickHouseConfig;

	constructor(config?: ClickHouseConfig) {
		this.config = {
			url: config?.url || process.env.CLICKHOUSE_URL || "http://localhost:8123",
			username: config?.username || process.env.CLICKHOUSE_USER || "default",
			password: config?.password || process.env.CLICKHOUSE_PASSWORD || "",
			database:
				config?.database || process.env.CLICKHOUSE_DATABASE || "observability",
			requestTimeout: config?.requestTimeout || 30000,
			maxOpenConnections: config?.maxOpenConnections || 10,
			compression: config?.compression || {
				request: true,
				response: true,
			},
		};

		this.client = createClient({
			url: this.config.url,
			username: this.config.username,
			password: this.config.password,
			database: this.config.database,
			request_timeout: this.config.requestTimeout,
			max_open_connections: this.config.maxOpenConnections,
			compression: this.config.compression,
		});
	}

	getClient(): ClickHouseClient {
		return this.client;
	}

	async ping(): Promise<boolean> {
		try {
			const result = await this.client.ping();
			return result.success;
		} catch (error) {
			console.error("ClickHouse ping failed:", error);
			return false;
		}
	}

	async close(): Promise<void> {
		await this.client.close();
	}

	async exec(query: string): Promise<void> {
		await this.client.exec({ query });
	}

	async query<T>(
		query: string,
		format: DataFormat = "JSONEachRow",
	): Promise<T[]> {
		const result = await this.client.query({
			query,
			format,
		});
		const json = await result.json<T>();
		return Array.isArray(json) ? json : [];
	}

	async insert<T>(
		table: string,
		values: T[],
		format: DataFormat = "JSONEachRow",
	): Promise<void> {
		await this.client.insert({
			table,
			values,
			format,
		});
	}
}

// Singleton instance
let connection: ClickHouseConnection | null = null;

export function getConnection(config?: ClickHouseConfig): ClickHouseConnection {
	if (!connection) {
		connection = new ClickHouseConnection(config);
	}
	return connection;
}

export async function closeConnection(): Promise<void> {
	if (connection) {
		await connection.close();
		connection = null;
	}
}

export { ClickHouseConnection };
