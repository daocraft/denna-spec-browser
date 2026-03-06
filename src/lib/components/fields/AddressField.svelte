<script lang="ts">
	const FORMATS = ['evm', 'solana', 'cosmos', 'bitcoin', 'aptos', 'sui', 'tron', 'other'];

	interface AddressObj {
		value: string;
		format: string;
	}

	interface Props {
		label: string;
		value: AddressObj;
		onChange: (value: AddressObj) => void;
	}

	let { label, value, onChange }: Props = $props();

	function handleValueChange(e: Event) {
		onChange({ ...value, value: (e.target as HTMLInputElement).value });
	}

	function handleFormatChange(e: Event) {
		onChange({ ...value, format: (e.target as HTMLSelectElement).value });
	}
</script>

<div class="space-y-1.5">
	<label class="text-xs font-medium text-muted-foreground">{label}</label>
	<div class="flex gap-2">
		<input
			type="text"
			value={value.value}
			oninput={handleValueChange}
			placeholder="0x... or base58..."
			class="flex-1 px-3 py-2 text-sm font-mono border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
		<select
			value={value.format}
			onchange={handleFormatChange}
			class="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		>
			{#each FORMATS as fmt}
				<option value={fmt}>{fmt}</option>
			{/each}
		</select>
	</div>
</div>
