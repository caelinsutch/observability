"use client";

import { Observability } from "@observability/observability";
import { useEffect } from "react";

export function ObservabilityProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	useEffect(() => {
		// Initialize observability with your endpoint
		// You'll need to replace this with your actual endpoint
		Observability.init({
			endpoint:
				process.env.NEXT_PUBLIC_OBSERVABILITY_ENDPOINT ||
				"http://localhost:8787",
			debug: process.env.NODE_ENV === "development",
			enableClickTracking: true,
			enableScrollTracking: true,
			enableErrorTracking: true,
			enablePerformanceTracking: true,
			enableConsoleErrorTracking: true,
			batchSize: 25,
			flushInterval: 3000,
			respectDoNotTrack: false,
		})
			.then((instance) => {
				console.log("Observability initialized");

				// Track custom events
				instance.track("app_loaded", {
					timestamp: new Date().toISOString(),
				});
			})
			.catch((error) => {
				console.error("Failed to initialize observability:", error);
			});

		// Cleanup on unmount
		return () => {
			const instance = Observability.getInstance();
			if (instance) {
				instance.flush().then(() => {
					instance.destroy();
				});
			}
		};
	}, []);

	return <>{children}</>;
}
