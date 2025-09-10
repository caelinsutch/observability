/**
 * Helper functions for managing allowed domains in KV storage
 */

export interface AllowedDomain {
	domain: string;
	enabled: boolean;
	description?: string;
	addedAt: string;
	updatedAt?: string;
}

/**
 * KV key for storing the list of allowed domains
 */
const ALLOWED_DOMAINS_KEY = 'allowed-domains-list';

/**
 * Get all allowed domains from KV storage
 */
export async function getAllowedDomains(kv: KVNamespace): Promise<AllowedDomain[]> {
	try {
		const domains = await kv.get<AllowedDomain[]>(ALLOWED_DOMAINS_KEY, 'json');
		return domains || [];
	} catch (error) {
		console.error('Error fetching allowed domains:', error);
		return [];
	}
}

/**
 * Check if a domain is allowed
 */
export async function isDomainAllowed(kv: KVNamespace, domain: string): Promise<boolean> {
	const domains = await getAllowedDomains(kv);
	
	// Check for exact match or wildcard match
	return domains.some(d => {
		if (!d.enabled) return false;
		
		// Exact match
		if (d.domain === domain) return true;
		
		// Wildcard match (e.g., *.example.com matches sub.example.com)
		if (d.domain.startsWith('*.')) {
			const baseDomain = d.domain.slice(2);
			return domain.endsWith(baseDomain);
		}
		
		return false;
	});
}

/**
 * Add a new allowed domain
 */
export async function addAllowedDomain(
	kv: KVNamespace, 
	domain: string, 
	description?: string
): Promise<void> {
	const domains = await getAllowedDomains(kv);
	
	// Check if domain already exists
	const existingIndex = domains.findIndex(d => d.domain === domain);
	
	if (existingIndex >= 0) {
		// Update existing domain
		domains[existingIndex] = {
			...domains[existingIndex],
			enabled: true,
			description: description || domains[existingIndex].description,
			updatedAt: new Date().toISOString()
		};
	} else {
		// Add new domain
		domains.push({
			domain,
			enabled: true,
			description,
			addedAt: new Date().toISOString()
		});
	}
	
	await kv.put(ALLOWED_DOMAINS_KEY, JSON.stringify(domains));
}

/**
 * Remove an allowed domain
 */
export async function removeAllowedDomain(kv: KVNamespace, domain: string): Promise<void> {
	const domains = await getAllowedDomains(kv);
	const filtered = domains.filter(d => d.domain !== domain);
	await kv.put(ALLOWED_DOMAINS_KEY, JSON.stringify(filtered));
}

/**
 * Enable or disable a domain
 */
export async function toggleDomain(
	kv: KVNamespace, 
	domain: string, 
	enabled: boolean
): Promise<void> {
	const domains = await getAllowedDomains(kv);
	const domainIndex = domains.findIndex(d => d.domain === domain);
	
	if (domainIndex >= 0) {
		domains[domainIndex].enabled = enabled;
		domains[domainIndex].updatedAt = new Date().toISOString();
		await kv.put(ALLOWED_DOMAINS_KEY, JSON.stringify(domains));
	}
}

/**
 * Initialize with default domains (call this once to set up initial domains)
 */
export async function initializeDefaultDomains(kv: KVNamespace): Promise<void> {
	const existingDomains = await getAllowedDomains(kv);
	
	if (existingDomains.length === 0) {
		const defaultDomains: AllowedDomain[] = [
			{
				domain: 'localhost',
				enabled: true,
				description: 'Local development',
				addedAt: new Date().toISOString()
			},
			{
				domain: '*.vercel.app',
				enabled: true,
				description: 'Vercel preview deployments',
				addedAt: new Date().toISOString()
			}
		];
		
		await kv.put(ALLOWED_DOMAINS_KEY, JSON.stringify(defaultDomains));
		console.log('Initialized default allowed domains');
	}
}

/**
 * Extract domain from origin header or URL
 */
export function extractDomain(request: Request): string | null {
	// Try to get domain from Origin header first
	const origin = request.headers.get('origin');
	if (origin) {
		try {
			const url = new URL(origin);
			return url.hostname;
		} catch (e) {
			console.error('Invalid origin header:', origin);
		}
	}
	
	// Fall back to Referer header
	const referer = request.headers.get('referer');
	if (referer) {
		try {
			const url = new URL(referer);
			return url.hostname;
		} catch (e) {
			console.error('Invalid referer header:', referer);
		}
	}
	
	return null;
}