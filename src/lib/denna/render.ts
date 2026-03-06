import type { Rate, Amount, Duration } from './types.js';

export function formatRate(rate: Rate): string {
	if (rate.unit === 'bps') {
		return `${rate.value} bps`;
	}
	return `${rate.value}%`;
}

export function formatAmount(amount: Amount): string {
	return `${amount.value.toLocaleString()} ${amount.currency}`;
}

export function formatDuration(duration: Duration): string {
	const plural = duration.value !== 1 ? 's' : '';
	return `${duration.value} ${duration.unit.replace(/s$/, '')}${plural}`;
}

export function shortenAddress(address: string, chars = 6): string {
	if (address.length <= chars * 2 + 2) return address;
	return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
