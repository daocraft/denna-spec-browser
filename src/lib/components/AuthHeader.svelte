<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import { Github, LogOut } from 'lucide-svelte';

	let currentUser = $derived($user);
</script>

{#if currentUser}
	<div class="flex items-center gap-2.5">
		<img
			src={currentUser.avatar_url}
			alt={currentUser.login}
			class="w-7 h-7 rounded-full ring-1 ring-border"
		/>
		<span class="text-sm font-semibold text-foreground hidden sm:block" style="letter-spacing: -0.01em">
			{currentUser.name ?? currentUser.login}
		</span>
		<a
			href="/auth/logout"
			class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted/60"
		>
			<LogOut class="w-3.5 h-3.5" />
			<span class="hidden sm:block">Sign out</span>
		</a>
	</div>
{:else}
	<a
		href="/auth/github"
		class="flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity tracking-wide"
		style="letter-spacing: 0.02em"
	>
		<Github class="w-3.5 h-3.5" />
		Sign in
	</a>
{/if}
