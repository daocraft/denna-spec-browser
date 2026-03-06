<script lang="ts">
	import type { Rate } from '$lib/denna/types.js';

	interface Props {
		label: string;
		value: Rate;
		onChange: (value: Rate) => void;
	}

	let { label, value, onChange }: Props = $props();

	function handleValueChange(e: Event) {
		const num = parseFloat((e.target as HTMLInputElement).value);
		if (!isNaN(num)) onChange({ ...value, value: num });
	}

	function handleUnitChange(e: Event) {
		onChange({ ...value, unit: (e.target as HTMLSelectElement).value as Rate['unit'] });
	}
</script>

<div class="space-y-1.5">
	<label class="text-xs font-medium text-muted-foreground">{label}</label>
	<div class="flex gap-2">
		<input
			type="number"
			value={value.value}
			step="0.01"
			oninput={handleValueChange}
			class="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
		<select
			value={value.unit}
			onchange={handleUnitChange}
			class="px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		>
			<option value="bps">bps</option>
			<option value="percent">%</option>
		</select>
	</div>
</div>
