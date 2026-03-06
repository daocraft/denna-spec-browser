<script lang="ts">
	import { Copy, Check } from 'lucide-svelte';
	import { isAddressObject } from '$lib/denna/detect.js';
	import { shortenAddress } from '$lib/denna/render.js';

	interface Props {
		chain: string;
		allocations: unknown[];
	}

	let { chain, allocations }: Props = $props();

	let copiedAddress = $state('');

	async function copyAddress(addr: string) {
		await navigator.clipboard.writeText(addr);
		copiedAddress = addr;
		setTimeout(() => (copiedAddress = ''), 2000);
	}

	function getAddr(alloc: Record<string, unknown>): string | null {
		// New format: contract field is an address object {value, format}
		if (isAddressObject(alloc.contract)) {
			return (alloc.contract as { value: string; format: string }).value;
		}
		// Also check vaultAddress
		if (isAddressObject(alloc.vaultAddress)) {
			return (alloc.vaultAddress as { value: string; format: string }).value;
		}
		// Old format: address field is a string
		if (typeof alloc.address === 'string') {
			return alloc.address;
		}
		return null;
	}

	function protocolHue(name: string): number {
		let h = 0;
		for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
		return h;
	}

	function chainHue(name: string): number {
		return protocolHue(name);
	}
</script>

<div class="border border-border rounded-lg overflow-hidden">
	<!-- Section header with accent bar -->
	<div class="flex items-center gap-0 border-b border-border bg-muted/30">
		<div class="w-0.5 self-stretch shrink-0" style="background: oklch(0.65 0.12 {chainHue(chain)})"></div>
		<div class="px-4 py-2.5 flex items-center gap-2">
			<span class="text-xs font-semibold text-foreground uppercase tracking-wider">{chain}</span>
			<span class="text-[10px] text-muted-foreground/60">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</span>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full text-xs">
			<thead>
				<tr class="bg-muted/40 border-b border-border">
					<th class="text-left px-4 py-2 text-muted-foreground font-semibold">Protocol</th>
					<th class="text-left px-4 py-2 text-muted-foreground font-semibold">Type</th>
					<th class="text-left px-4 py-2 text-muted-foreground font-semibold">Underlying</th>
					<th class="text-left px-4 py-2 text-muted-foreground font-semibold">Address</th>
					<th class="text-left px-4 py-2 text-muted-foreground font-semibold">Notes</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/40">
				{#each allocations as rawAlloc}
					{@const alloc = rawAlloc as Record<string, unknown>}
					{@const protocol = (alloc.protocol ?? '—') as string}
					{@const type = alloc.type as string | undefined}
					{@const underlying = alloc.underlying as string | undefined}
					{@const addr = getAddr(alloc)}
					{@const notes = alloc.notes as string | undefined}
					{@const hue = protocolHue(protocol)}
					<tr class="hover:bg-muted/20 transition-colors">
						<!-- Protocol column: colored dot + name -->
						<td class="px-4 py-2.5 text-foreground font-medium">
							<span class="inline-flex items-center gap-1.5">
								<span
									class="w-1.5 h-1.5 rounded-full shrink-0"
									style="background: oklch(0.65 0.12 {hue})"
								></span>
								{protocol}
							</span>
						</td>

						<!-- Type column: mono small tag -->
						<td class="px-4 py-2.5">
							{#if type}
								<span class="font-mono text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{type}</span>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</td>

						<!-- Underlying column: asset badge -->
						<td class="px-4 py-2.5">
							{#if underlying}
								<span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{underlying}</span>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</td>

						<!-- Address column: shortened with copy -->
						<td class="px-4 py-2.5 font-mono">
							{#if addr}
								<button
									onclick={() => copyAddress(addr)}
									class="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group"
									title={addr}
								>
									<span>{shortenAddress(addr)}</span>
									{#if copiedAddress === addr}
										<Check class="w-3 h-3 text-badge-success" />
									{:else}
										<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									{/if}
								</button>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</td>

						<!-- Notes column: truncated, full on hover -->
						<td class="px-4 py-2.5 text-muted-foreground max-w-[240px]">
							{#if notes}
								<span class="block truncate" title={notes}>{notes}</span>
							{:else}
								<span class="text-muted-foreground/40">—</span>
							{/if}
						</td>
					</tr>
					<!-- activeFromBlock extra info row if present -->
					{#if alloc.activeFromBlock !== undefined}
						<tr class="bg-muted/10">
							<td colspan="5" class="px-4 py-1">
								<span class="text-[10px] font-mono text-muted-foreground/50">
									active from block <span class="text-muted-foreground">{String(alloc.activeFromBlock)}</span>
								</span>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</div>
