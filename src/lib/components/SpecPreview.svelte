<script lang="ts">
	import MetadataCard from './MetadataCard.svelte';
	import AllocationTable from './AllocationTable.svelte';
	import JsonViewer from './JsonViewer.svelte';
	import { isAddressObject } from '$lib/denna/detect.js';
	import { shortenAddress } from '$lib/denna/render.js';
	import { schemaHasParametersWrapper } from '$lib/denna/schema.js';
	import { Copy, Check, CheckCircle2, XCircle, AlertTriangle } from 'lucide-svelte';
	import type { DennaSpec } from '$lib/denna/types.js';

	interface Props {
		spec: DennaSpec;
		domainSchema?: unknown;
	}

	let { spec, domainSchema = null }: Props = $props();

	// Use schema to determine if data is under a `parameters` wrapper.
	// If no schema is available, fall back to duck-typing the data shape.
	const raw = $derived(spec as Record<string, unknown>);
	const hasParamsWrapper = $derived(
		domainSchema
			? schemaHasParametersWrapper(domainSchema)
			: typeof raw.parameters === 'object' && raw.parameters !== null && !Array.isArray(raw.parameters)
	);
	const params = $derived(
		hasParamsWrapper ? (raw.parameters as Record<string, unknown>) : raw
	);

	let copiedAddress = $state('');

	async function copyAddress(addr: string) {
		await navigator.clipboard.writeText(addr);
		copiedAddress = addr;
		setTimeout(() => (copiedAddress = ''), 2000);
	}

	function issueStatusColor(status: string) {
		if (status === 'resolved') return 'text-badge-success bg-badge-success-bg';
		if (status === 'open') return 'text-destructive bg-destructive/10';
		return 'text-badge-warning bg-badge-warning-bg';
	}

	function sectionTitle(key: string): string {
		return key
			.replace(/([A-Z])/g, ' $1')
			.replace(/_/g, ' ')
			.trim()
			.replace(/^\w/, (c) => c.toUpperCase());
	}

	function chainHue(name: string): number {
		let h = 0;
		for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
		return h;
	}

	// Keys with dedicated UI — everything else goes through JsonViewer
	const DEDICATED = new Set([
		'chains', 'allocations', 'calculationModules', 'knownIssues', 'addressClassifications'
	]);

	// Derived sections: all params keys not in DEDICATED set and not $schema
	let genericSections = $derived(
		Object.entries(params).filter(([k]) => !DEDICATED.has(k) && k !== '$schema')
	);

	// Typed accessors for dedicated sections
	let chains = $derived(Array.isArray(params.chains) ? (params.chains as Record<string, unknown>[]) : []);
	let allocations = $derived(
		params.allocations !== null &&
		typeof params.allocations === 'object' &&
		!Array.isArray(params.allocations)
			? (params.allocations as Record<string, unknown[]>)
			: null
	);
	let calculationModules = $derived(
		Array.isArray(params.calculationModules)
			? (params.calculationModules as Record<string, unknown>[])
			: []
	);
	let knownIssues = $derived(
		Array.isArray(params.knownIssues)
			? (params.knownIssues as Record<string, unknown>[])
			: []
	);
	let addressClassifications = $derived(
		params.addressClassifications !== null &&
		typeof params.addressClassifications === 'object' &&
		!Array.isArray(params.addressClassifications)
			? (params.addressClassifications as Record<string, Record<string, unknown>[]>)
			: null
	);
</script>

<div class="space-y-6">
	<!-- 1. Metadata -->
	{#if spec.metadata}
		<MetadataCard metadata={spec.metadata} />
	{/if}

	<!-- 2. Chains -->
	{#if chains.length > 0}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chains</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each chains as chain}
					{@const name = (chain.name ?? chain.id ?? 'Unknown') as string}
					{@const chainId = chain.id as string | undefined}
					{@const features = chain.features as Record<string, boolean> | undefined}
					{@const hue = chainHue(name)}
					{@const addrFields = Object.entries(chain).filter(
						([k, v]) =>
							k !== 'id' && k !== 'name' && k !== 'features' && k !== 'chainId' && k !== 'enabled' && isAddressObject(v)
					)}
					<div
						class="border border-border rounded-lg p-4 bg-card overflow-hidden relative"
						style="border-left: 3px solid oklch(0.65 0.12 {hue} / 0.6)"
					>
						<!-- Chain name + id -->
						<div class="flex items-center justify-between mb-2 gap-2">
							<div class="flex items-baseline gap-2 min-w-0">
								<span class="font-semibold text-sm text-foreground truncate">{name}</span>
								{#if chainId && chainId !== name}
									<span class="text-[10px] font-mono text-muted-foreground/50 shrink-0">{chainId}</span>
								{/if}
							</div>
							{#if chain.enabled !== undefined}
								<span class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 {chain.enabled
									? 'bg-badge-success-bg text-badge-success border border-badge-success/20'
									: 'bg-muted text-muted-foreground/50'}">
									{chain.enabled ? 'Enabled' : 'Disabled'}
								</span>
							{/if}
						</div>

						<!-- Address fields (new format: address objects) -->
						{#each addrFields as [key, addrObj]}
							{@const addr = (addrObj as { value: string; format: string })}
							<div class="flex items-center gap-2 mt-1.5">
								<span class="text-[10px] font-mono text-muted-foreground/60 w-20 shrink-0 truncate">{key}</span>
								<button
									onclick={() => copyAddress(addr.value)}
									class="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
									title={addr.value}
								>
									<span>{shortenAddress(addr.value)}</span>
									{#if copiedAddress === addr.value}
										<Check class="w-3 h-3 text-badge-success" />
									{:else}
										<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									{/if}
								</button>
							</div>
						{/each}

						<!-- Old format: proxyAddress string -->
						{#if typeof chain.proxyAddress === 'string'}
							<div class="flex items-center gap-2 mt-1.5">
								<span class="text-[10px] font-mono text-muted-foreground/60 w-20 shrink-0">proxyAddress</span>
								<button
									onclick={() => copyAddress(chain.proxyAddress as string)}
									class="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
									title={chain.proxyAddress as string}
								>
									<span>{shortenAddress(chain.proxyAddress as string)}</span>
									{#if copiedAddress === chain.proxyAddress}
										<Check class="w-3 h-3 text-badge-success" />
									{:else}
										<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									{/if}
								</button>
							</div>
						{/if}

						<!-- Features -->
						{#if features}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each Object.entries(features) as [feat, enabled]}
									<span class="text-[10px] px-1.5 py-0.5 rounded-full {enabled
										? 'bg-primary/15 text-primary border border-primary/20 font-semibold'
										: 'bg-muted text-muted-foreground/40'}">
										{feat}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 3. Allocations -->
	{#if allocations && Object.keys(allocations).length > 0}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Allocations</h2>
			<div class="space-y-3">
				{#each Object.entries(allocations) as [chain, allocs]}
					<AllocationTable chain={chain} allocations={allocs as unknown[]} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- 4. Calculation Modules -->
	{#if calculationModules.length > 0}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Calculation Modules</h2>
			<div class="space-y-1.5">
				{#each calculationModules as mod}
					{@const enabled = mod.enabled as boolean | undefined}
					<div class="flex items-start gap-3 px-4 py-3 border border-border rounded-lg bg-card">
						{#if enabled}
							<CheckCircle2 class="w-4 h-4 text-badge-success mt-0.5 shrink-0" />
						{:else}
							<XCircle class="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
						{/if}
						<div class="flex-1">
							<p class="text-sm font-medium {enabled ? 'text-foreground' : 'text-muted-foreground'}">
								{(mod.name ?? mod.id ?? 'Unknown Module') as string}
							</p>
							{#if mod.notes}
								<p class="text-xs text-muted-foreground mt-0.5">{mod.notes as string}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 5. Known Issues -->
	{#if knownIssues.length > 0}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Known Issues</h2>
			<div class="space-y-2">
				{#each knownIssues as issue}
					{@const status = issue.status as string | undefined}
					{@const severity = issue.severity as string | undefined}
					<div class="flex items-start gap-3 px-4 py-3 border border-border rounded-lg bg-card">
						<AlertTriangle class="w-4 h-4 text-badge-warning mt-0.5 shrink-0" />
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								{#if status}
									<span class="text-xs px-2 py-0.5 rounded-full font-medium {issueStatusColor(status)}">
										{status}
									</span>
								{/if}
								{#if severity}
									<span class="text-xs text-muted-foreground">{severity}</span>
								{/if}
							</div>
							<p class="text-sm text-foreground">{(issue.description ?? 'No description') as string}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 6. Address Classifications -->
	{#if addressClassifications && Object.keys(addressClassifications).length > 0}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address Classifications</h2>
			<div class="space-y-3">
				{#each Object.entries(addressClassifications) as [category, entries]}
					<div class="border border-border rounded-lg overflow-hidden">
						<div class="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border capitalize">
							{category.replace(/_/g, ' ')}
						</div>
						<div class="divide-y divide-border">
							{#each entries as entry}
								{@const rawAddr = entry.address}
							{@const entryAddress = isAddressObject(rawAddr) ? (rawAddr as { value: string; format: string }).value : (rawAddr as string)}
								{@const entryLabel = entry.label as string | undefined}
								<div class="flex items-center justify-between px-4 py-2">
									<span class="text-xs text-foreground">{entryLabel ?? entryAddress}</span>
									<button
										onclick={() => copyAddress(entryAddress)}
										class="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
										title={entryAddress}
									>
										<span>{shortenAddress(entryAddress)}</span>
										{#if copiedAddress === entryAddress}
											<Check class="w-3 h-3 text-badge-success" />
										{:else}
											<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 7. Generic sections — all other params keys -->
	{#each genericSections as [key, val]}
		{@const schemaPath = hasParamsWrapper ? ['parameters', key] : [key]}
		<div>
			<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
				{sectionTitle(key)}
			</h2>
			<div class="border border-border rounded-lg px-4 py-4 bg-card">
				<JsonViewer value={val} depth={0} schema={domainSchema} schemaPath={schemaPath} />
			</div>
		</div>
	{/each}
</div>
