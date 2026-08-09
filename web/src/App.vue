<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { generateQrPng, type FinderTarget } from './lib/qr';
import QrContentForm from './components/QrContentForm.vue';
import LogoSettings from './components/LogoSettings.vue';
import QrPreview from './components/QrPreview.vue';

const value = ref('https://beacon.qr');
const darkColor = ref('#0B1F1A');
const lightColor = ref('#F7F3EB');
const size = ref(512);
const centerScale = ref(22);
const finderTarget = ref<FinderTarget>('none');

const centerFile = ref<File | null>(null);
const finderFile = ref<File | null>(null);
const centerPreview = ref<string | null>(null);
const finderPreview = ref<string | null>(null);

const qrUrl = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const generated = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let objectUrl: string | null = null;

const canGenerate = computed(() => value.value.trim().length > 0);

function revokeUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function setPreview(file: File | null, target: 'center' | 'finder') {
  const key = target === 'center' ? centerPreview : finderPreview;
  if (key.value?.startsWith('blob:')) URL.revokeObjectURL(key.value);
  key.value = file ? URL.createObjectURL(file) : null;
}

function onCenterChange(file: File) {
  centerFile.value = file;
  setPreview(file, 'center');
  queueGenerate();
}

function onFinderChange(file: File) {
  finderFile.value = file;
  setPreview(file, 'finder');
  queueGenerate();
}

function clearCenter() {
  centerFile.value = null;
  setPreview(null, 'center');
  queueGenerate();
}

function clearFinder() {
  finderFile.value = null;
  setPreview(null, 'finder');
  queueGenerate();
}

function queueGenerate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void generate();
  }, 350);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load ${file.name}`));
    };
    image.src = url;
  });
}

async function generate() {
  if (!canGenerate.value) return;

  loading.value = true;
  error.value = null;

  try {
    const [centerImage, finderImage] = await Promise.all([
      centerFile.value ? loadImage(centerFile.value) : Promise.resolve(null),
      finderFile.value ? loadImage(finderFile.value) : Promise.resolve(null),
    ]);

    const blob = await generateQrPng({
      value: value.value,
      size: size.value,
      darkColor: darkColor.value,
      lightColor: lightColor.value,
      finderTarget: finderTarget.value,
      centerScale: centerScale.value,
      centerImage,
      finderImage,
    });

    revokeUrl();
    objectUrl = URL.createObjectURL(blob);
    qrUrl.value = objectUrl;
    generated.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong';
  } finally {
    loading.value = false;
  }
}

function download() {
  if (!qrUrl.value) return;
  const link = document.createElement('a');
  link.href = qrUrl.value;
  link.download = 'beacon-qr.png';
  link.click();
}

watch(
  [value, darkColor, lightColor, size, centerScale, finderTarget],
  () => queueGenerate(),
);

void generate();

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  revokeUrl();
  setPreview(null, 'center');
  setPreview(null, 'finder');
});
</script>

<template>
  <div class="page">
    <header class="hero">
      <p class="brand">Beacon</p>
      <h1>QR codes that carry your mark</h1>
      <p class="lede">
        Encode any link or text, then stamp a logo in the center or on the finder squares, all rendered locally in your browser.
      </p>
    </header>

    <main class="workspace">
      <section class="controls" aria-label="QR settings">
        <QrContentForm
          v-model:value="value"
          v-model:dark-color="darkColor"
          v-model:light-color="lightColor"
          v-model:size="size"
        />

        <LogoSettings
          v-model:center-scale="centerScale"
          v-model:finder-target="finderTarget"
          :center-preview="centerPreview"
          :finder-preview="finderPreview"
          :has-center-file="Boolean(centerFile)"
          :has-finder-file="Boolean(finderFile)"
          @center-change="onCenterChange"
          @finder-change="onFinderChange"
          @center-clear="clearCenter"
          @finder-clear="clearFinder"
        />

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </section>

      <QrPreview
        class="preview-pane"
        :qr-url="qrUrl"
        :loading="loading"
        :can-generate="canGenerate"
        :generated="generated"
        @generate="generate"
        @download="download"
      />
    </main>

    <footer class="site-footer">
      <p class="credit">
        <span>Made by</span>
        <liteshade-brand
          color="currentColor"
          size="18"
          referral="beacon"
        ></liteshade-brand>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.page {
  width: min(1120px, calc(100% - 2.5rem));
  margin: 0 auto;
  padding: 2.75rem 0 4rem;
}

.hero {
  max-width: 34rem;
  margin-bottom: 2.75rem;
  animation: rise 0.7s ease both;
}

.brand {
  margin: 0 0 0.85rem;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 8vw, 4.6rem);
  font-weight: 700;
  line-height: 0.92;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.hero h1 {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1.15rem, 2.4vw, 1.45rem);
  font-weight: 500;
  line-height: 1.35;
  color: var(--ink-soft);
}

.lede {
  margin: 0.85rem 0 0;
  max-width: 28rem;
  font-size: 1.02rem;
  line-height: 1.55;
  color: rgba(11, 31, 26, 0.72);
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
  gap: 2rem;
  align-items: start;
  animation: rise 0.8s ease 0.08s both;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.error {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 107, 61, 0.12);
  color: #9a2f10;
  font-size: 0.92rem;
}

.site-footer {
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(11, 31, 26, 0.1);
  animation: rise 0.85s ease 0.12s both;
}

.credit {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  color: rgba(11, 31, 26, 0.62);
  font-size: 0.92rem;
  font-weight: 500;
}

.credit liteshade-brand {
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 860px) {
  .page {
    width: min(100% - 1.5rem, 1120px);
    padding-top: 1.75rem;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .preview-pane {
    order: -1;
  }
}
</style>
