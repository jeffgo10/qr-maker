<script setup lang="ts">
defineProps<{
  qrUrl: string | null;
  loading: boolean;
  canGenerate: boolean;
  generated: boolean;
}>();

const emit = defineEmits<{
  generate: [];
  download: [];
}>();
</script>

<template>
  <section class="preview" aria-label="QR preview">
    <div class="preview-stage">
      <div class="preview-frame" :class="{ loading }">
        <img
          v-if="qrUrl"
          :src="qrUrl"
          alt="Generated QR code"
          class="qr-image"
        />
        <div v-else class="preview-placeholder">Your QR will appear here</div>
      </div>
      <div class="preview-actions">
        <button
          type="button"
          class="primary"
          :disabled="!canGenerate || loading"
          @click="emit('generate')"
        >
          {{ loading ? 'Generating…' : 'Generate' }}
        </button>
        <button
          type="button"
          class="secondary"
          :disabled="!generated || !qrUrl"
          @click="emit('download')"
        >
          Download PNG
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview {
  position: sticky;
  top: 1.25rem;
}

.preview-stage {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.preview-frame {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  padding: 1.35rem;
  border-radius: 28px;
  background: linear-gradient(
    160deg,
    rgba(11, 31, 26, 0.92),
    rgba(26, 58, 49, 0.88)
  );
  box-shadow:
    0 30px 60px rgba(11, 31, 26, 0.22),
    inset 0 1px 0 rgba(232, 255, 106, 0.18);
  transition: transform 0.35s ease;
}

.preview-frame:hover {
  transform: translateY(-4px);
}

.preview-frame.loading {
  opacity: 0.72;
}

.qr-image {
  width: min(100%, 360px);
  height: auto;
  border-radius: 18px;
  background: var(--paper);
  animation: pop 0.45s ease both;
}

.preview-placeholder {
  color: rgba(244, 239, 228, 0.55);
  font-size: 0.95rem;
}

.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.primary,
.secondary {
  border: none;
  border-radius: 999px;
  padding: 0.95rem 1.1rem;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.primary {
  background: var(--signal);
  color: var(--ink);
  box-shadow: 0 12px 28px rgba(232, 255, 106, 0.28);
}

.secondary {
  background: transparent;
  color: var(--ink);
  border: 1.5px solid rgba(11, 31, 26, 0.2);
}

.primary:hover:not(:disabled),
.secondary:hover:not(:disabled) {
  transform: translateY(-2px);
}

.primary:disabled,
.secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 860px) {
  .preview {
    position: static;
  }
}
</style>
