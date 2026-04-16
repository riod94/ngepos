/**
 * Structured logging utility for server-side API endpoints.
 * Provides consistent log formatting with context, levels, and timestamps.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	module: string;
	message: string;
	details?: Record<string, any>;
}

function formatLog(entry: LogEntry): string {
	const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
	if (entry.details && Object.keys(entry.details).length > 0) {
		return `${base} ${JSON.stringify(entry.details)}`;
	}
	return base;
}

function isoNow(): string {
	return new Date().toISOString();
}

/** Create a scoped logger for a specific module/endpoint */
export function createLogger(module: string) {
	return {
		debug(message: string, details?: Record<string, any>) {
			if (process.env.LOG_LEVEL === "debug") {
				console.debug(formatLog({ timestamp: isoNow(), level: "debug", module, message, details }));
			}
		},

		info(message: string, details?: Record<string, any>) {
			console.info(formatLog({ timestamp: isoNow(), level: "info", module, message, details }));
		},

		warn(message: string, details?: Record<string, any>) {
			console.warn(formatLog({ timestamp: isoNow(), level: "warn", module, message, details }));
		},

		error(message: string, details?: Record<string, any>) {
			console.error(formatLog({ timestamp: isoNow(), level: "error", module, message, details }));
		},

		/** Log an API request with method, path, and status */
		apiRequest(method: string, path: string, status: number, durationMs?: number, details?: Record<string, any>) {
			const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
			const entry: LogEntry = {
				timestamp: isoNow(),
				level,
				module,
				message: `${method} ${path} → ${status}`,
				details: {
					...details,
					...(durationMs !== undefined ? { durationMs } : {}),
				},
			};
			const formatted = formatLog(entry);
			if (level === "error") console.error(formatted);
			else if (level === "warn") console.warn(formatted);
			else console.info(formatted);
		},
	};
}
