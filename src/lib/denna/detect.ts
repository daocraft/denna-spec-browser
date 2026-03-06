import type { Rate, Amount, Duration } from './types.js';

export function isRate(value: unknown): value is Rate {
	if (!value || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.value === 'number' &&
		typeof obj.unit === 'string' &&
		(obj.unit === 'bps' || obj.unit === 'percent')
	);
}

export function isAmount(value: unknown): value is Amount {
	if (!value || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return typeof obj.value === 'number' && typeof obj.currency === 'string';
}

export function isDuration(value: unknown): value is Duration {
	if (!value || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.value === 'number' &&
		typeof obj.unit === 'string' &&
		['months', 'days', 'hours', 'seconds'].includes(obj.unit as string)
	);
}

export function isAddress(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	// EVM address
	if (/^0x[0-9a-fA-F]{40}$/.test(value)) return true;
	// Solana (base58, 32-44 chars)
	if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return true;
	return false;
}

// Detects the Denna address object shape: { value: string, format: string }
export function isAddressObject(value: unknown): value is { value: string; format: string } {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj);
	return (
		keys.length === 2 &&
		typeof obj.value === 'string' &&
		typeof obj.format === 'string'
	);
}
