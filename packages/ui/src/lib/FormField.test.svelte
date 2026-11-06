<script lang="ts">
  import FormField from './FormField.svelte';
</script>
<FormField id="name" label="Name" helper="Use your public name" error="A name is required">
  {#snippet children(control)}
    <input id={control.id} aria-describedby={control.describedBy} aria-invalid={control.invalid} />
  {/snippet}
</FormField>
