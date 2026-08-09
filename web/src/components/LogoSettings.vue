<script setup lang="ts">
import type { FinderTarget } from '../lib/qr';
import LogoMarkPanel from './LogoMarkPanel.vue';

const centerScale = defineModel<number>('centerScale', { required: true });
const finderTarget = defineModel<FinderTarget>('finderTarget', {
  required: true,
});

defineProps<{
  centerPreview: string | null;
  finderPreview: string | null;
  hasCenterFile: boolean;
  hasFinderFile: boolean;
}>();

const emit = defineEmits<{
  centerChange: [file: File];
  finderChange: [file: File];
  centerClear: [];
  finderClear: [];
}>();

const finderOptions: { value: FinderTarget; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All three' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
];

function onCenterChange(file: File) {
  emit('centerChange', file);
}

function onFinderChange(file: File) {
  if (finderTarget.value === 'none') {
    finderTarget.value = 'all';
  }
  emit('finderChange', file);
}
</script>

<template>
  <div class="logo-settings">
    <LogoMarkPanel
      title="Center logo"
      :preview-url="centerPreview"
      preview-alt="Center logo preview"
      empty-title="Drop or choose an image"
      empty-hint="PNG, JPG, WebP · shown in the middle"
      :has-file="hasCenterFile"
      @change="onCenterChange"
      @clear="emit('centerClear')"
    >
      <label class="field slider">
        <span>Logo size · {{ centerScale }}%</span>
        <input v-model.number="centerScale" type="range" min="12" max="35" />
      </label>
    </LogoMarkPanel>

    <LogoMarkPanel
      title="Finder square marks"
      :preview-url="finderPreview"
      preview-alt="Finder mark preview"
      empty-title="Image for finder squares"
      empty-hint="Optional · applied to the selected corners"
      :has-file="hasFinderFile"
      @change="onFinderChange"
      @clear="emit('finderClear')"
    >
      <template #before-upload>
        <p class="hint">
          Place an image inside the three corner squares — or just one of them. The outer ring stays so scanners still lock on.
        </p>
        <div class="chips" role="radiogroup" aria-label="Finder target">
          <button
            v-for="option in finderOptions"
            :key="option.value"
            type="button"
            class="chip"
            :class="{ active: finderTarget === option.value }"
            :aria-pressed="finderTarget === option.value"
            @click="finderTarget = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </template>
    </LogoMarkPanel>
  </div>
</template>

<style scoped src="./controls.css"></style>

<style scoped>
.logo-settings {
  display: flex;
  flex-direction: column;
}

.hint {
  margin: 0 0 0.9rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(11, 31, 26, 0.65);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
}

.slider {
  margin-top: 0.85rem;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--ember);
}
</style>
