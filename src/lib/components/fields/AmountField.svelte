<script lang="ts">
	import type { Amount } from '$lib/denna/types.js';

	interface Props {
		label: string;
		value: Amount;
		onChange: (value: Amount) => void;
	}

	let { label, value, onChange }: Props = $props();

	const commonCurrencies = ['USD', 'USDC', 'ETH', 'DAI', 'USDT', 'WBTC', 'wstETH'];

	function handleValueChange(e: Event) {
		const num = parseFloat((e.target as HTMLInputElement).value);
		if (!isNaN(num)) onChange({ ...value, value: num });
	}

	function handleCurrencyChange(e: Event) {
		onChange({ ...value, currency: (e.target as HTMLInputElement).value });
	}
</script>

<div class="space-y-1.5">
	{#if label}<label for="amount-value" class="text-xs font-medium text-muted-foreground">{label}</label>{/if}
	<div class="flex gap-2">
		<input
			id="amount-value"
			type="number"
			value={value.value}
			step="any"
			oninput={handleValueChange}
			class="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
		<input
			type="text"
			value={value.currency}
			oninput={handleCurrencyChange}
			list="currency-options"
			placeholder="Currency"
			class="w-28 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
		<datalist id="currency-options">
			{#each commonCurrencies as c}
				<option value={c}>{c}</option>
			{/each}
		</datalist>
	</div>
</div>
