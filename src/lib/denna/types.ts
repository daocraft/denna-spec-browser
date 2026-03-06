export interface Rate {
	value: number;
	unit: 'bps' | 'percent';
}

export interface Amount {
	value: number;
	currency: string;
}

export interface Duration {
	value: number;
	unit: 'months' | 'days' | 'hours' | 'seconds';
}

export interface SpecAddress {
	address: string;
	format?: 'evm' | 'solana' | 'cosmos' | 'bitcoin' | 'other';
}

export interface SpecMetadata {
	id?: string;
	name?: string;
	kind?: string;
	version?: string;
	description?: string;
	lastUpdated?: string;
	tags?: string[];
	source?: {
		references?: string[];
	};
}

export interface AllocationEntry {
	protocol?: string;
	type?: string;
	underlying?: string;
	address?: string;
	notes?: string;
}

export interface ChainConfig {
	name?: string;
	chainId?: number | string;
	enabled?: boolean;
	proxyAddress?: string;
	features?: Record<string, boolean>;
	allocations?: AllocationEntry[];
}

export interface CalculationModule {
	id?: string;
	name?: string;
	enabled?: boolean;
	notes?: string;
}

export interface KnownIssue {
	id?: string;
	status?: string;
	description?: string;
	severity?: string;
}

export interface AddressClassificationEntry {
	address: string;
	label?: string;
	format?: string;
}

export interface DennaSpec {
	metadata?: SpecMetadata;
	chains?: ChainConfig[];
	allocations?: Record<string, AllocationEntry[]>;
	rates?: Record<string, Rate>;
	calculationModules?: CalculationModule[];
	knownIssues?: KnownIssue[];
	addressClassifications?: Record<string, AddressClassificationEntry[]>;
	[key: string]: unknown;
}

export interface SpecFile {
	path: string;
	sha: string;
}
