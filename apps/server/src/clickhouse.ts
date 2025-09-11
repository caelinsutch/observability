import { getConnection, type ClickHouseConnection } from "@observability/clickhouse";
import { env } from "./env.js";

let clickhouseInstance: ClickHouseConnection | null = null;

export const getClickHouseClient = (): ClickHouseConnection => {
	if (!clickhouseInstance) {
		clickhouseInstance = getConnection({
			url: env.CLICKHOUSE_URL,
			username: env.CLICKHOUSE_USER,
			password: env.CLICKHOUSE_PASSWORD,
			database: env.CLICKHOUSE_DATABASE,
		});
	}
	return clickhouseInstance;
};

export const closeClickHouse = async (): Promise<void> => {
	if (clickhouseInstance) {
		await clickhouseInstance.close();
		clickhouseInstance = null;
	}
};