<script setup lang="ts">
defineProps<{
  title: string;
  previewUrl: string | null;
  previewAlt: string;
  emptyTitle: string;
  emptyHint: string;
  hasFile: boolean;
}>();

const emit = defineEmits<{
  change: [file: File];
  clear: [];
}>();

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('change', file);
  input.value = '';
}
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ title }}</h2>
      <button
        v-if="hasFile"
        type="button"
        class="ghost"
        @click="emit('clear')"
      >
        Remove
      </button>
    </div>

    <slot name="before-upload" />

    <label class="upload">
      <input type="file" accept="image/*" @change="onFileChange" />
      <div v-if="previewUrl" class="upload-preview">
        <img :src="previewUrl" :alt="previewAlt" />
      </div>
      <div v-else class="upload-empty">
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyHint }}</span>
      </div>
    </label>

    <slot />
  </div>
</template>

<style scoped src="./controls.css"></style>
