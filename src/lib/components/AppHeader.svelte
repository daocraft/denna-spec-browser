<script lang="ts">
	import AuthHeader from './AuthHeader.svelte';
	import { theme } from '$lib/stores/theme.js';
	import { Sun, Moon } from 'lucide-svelte';
	import dennaSpecLogoLight from '$lib/assets/denna-spec-logo.svg';
	import dennaSpecLogoDark from '$lib/assets/denna-spec-logo-dark.svg';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let isDark = $derived($theme === 'dark');
</script>

<header class="sticky top-0 z-10 bg-card/90 backdrop-blur-md">
	<!-- Thin primary-to-secondary gradient accent at very top -->
	<div class="h-[2px] w-full accent-line"></div>

	<div class="w-full px-6 flex items-center justify-between gap-4 h-[52px]">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
			<img
				src={isDark ? dennaSpecLogoDark : dennaSpecLogoLight}
				alt="Denna Spec Browser"
				class="h-[26px] w-auto"
			/>
			<span class="text-xs font-semibold tracking-widest uppercase text-muted-foreground hidden sm:block" style="letter-spacing: 0.18em">Browser</span>
		</a>

		<!-- Optional center slot -->
		{#if children}
			<div class="flex-1 min-w-0">
				{@render children()}
			</div>
		{/if}

		<!-- Right: theme toggle + auth -->
		<div class="flex items-center gap-1 shrink-0">
			<button
				onclick={() => theme.toggle()}
				aria-label="Toggle theme"
				class="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
			>
				{#if isDark}
					<Sun class="w-[15px] h-[15px]" />
				{:else}
					<Moon class="w-[15px] h-[15px]" />
				{/if}
			</button>
			<div class="w-px h-4 bg-border mx-2"></div>
			<AuthHeader />
		</div>
	</div>

	<div class="h-px w-full bg-border/70"></div>
</header>
