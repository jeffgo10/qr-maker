<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { generateQrPng, type FinderTarget } from './lib/qr'

const value = ref('https://beacon.qr')
const darkColor = ref('#0B1F1A')
const lightColor = ref('#F7F3EB')
const size = ref(512)
const centerScale = ref(22)
const finderTarget = ref<FinderTarget>('none')

const centerFile = ref<File | null>(null)
const finderFile = ref<File | null>(null)
const centerPreview = ref<string | null>(null)
const finderPreview = ref<string | null>(null)

const qrUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const generated = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let objectUrl: string | null = null

const canGenerate = computed(() => value.value.trim().length > 0)

const finderOptions: { value: FinderTarget; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All three' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
]

function revokeUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

function setPreview(file: File | null, target: 'center' | 'finder') {
  const key = target === 'center' ? centerPreview : finderPreview
  if (key.value?.startsWith('blob:')) URL.revokeObjectURL(key.value)
  key.value = file ? URL.createObjectURL(file) : null
}

function onCenterChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  centerFile.value = file
  setPreview(file, 'center')
  queueGenerate()
}

function onFinderChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  finderFile.value = file
  setPreview(file, 'finder')
  if (file && finderTarget.value === 'none') {
    finderTarget.value = 'all'
  }
  queueGenerate()
}

function clearCenter() {
  centerFile.value = null
  setPreview(null, 'center')
  queueGenerate()
}

function clearFinder() {
  finderFile.value = null
  setPreview(null, 'finder')
  queueGenerate()
}

function queueGenerate() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void generate()
  }, 350)
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not load ${file.name}`))
    }
    image.src = url
  })
}

async function generate() {
  if (!canGenerate.value) return

  loading.value = true
  error.value = null

  try {
    const [centerImage, finderImage] = await Promise.all([
      centerFile.value ? loadImage(centerFile.value) : Promise.resolve(null),
      finderFile.value ? loadImage(finderFile.value) : Promise.resolve(null),
    ])

    const blob = await generateQrPng({
      value: value.value,
      size: size.value,
      darkColor: darkColor.value,
      lightColor: lightColor.value,
      finderTarget: finderTarget.value,
      centerScale: centerScale.value,
      centerImage,
      finderImage,
    })

    revokeUrl()
    objectUrl = URL.createObjectURL(blob)
    qrUrl.value = objectUrl
    generated.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    loading.value = false
  }
}

function download() {
  if (!qrUrl.value) return
  const link = document.createElement('a')
  link.href = qrUrl.value
  link.download = 'beacon-qr.png'
  link.click()
}

watch(
  [value, darkColor, lightColor, size, centerScale, finderTarget],
  () => queueGenerate(),
)

void generate()

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  revokeUrl()
  setPreview(null, 'center')
  setPreview(null, 'finder')
})
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
        <label class="field">
          <span>Content</span>
          <textarea
            v-model="value"
            rows="3"
            placeholder="URL, text, or anything you want encoded"
          />
        </label>

        <div class="row">
          <label class="field">
            <span>Foreground</span>
            <input v-model="darkColor" type="color" />
          </label>
          <label class="field">
            <span>Background</span>
            <input v-model="lightColor" type="color" />
          </label>
          <label class="field">
            <span>Size</span>
            <select v-model.number="size">
              <option :value="256">256px</option>
              <option :value="512">512px</option>
              <option :value="768">768px</option>
              <option :value="1024">1024px</option>
            </select>
          </label>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Center logo</h2>
            <button
              v-if="centerFile"
              type="button"
              class="ghost"
              @click="clearCenter"
            >
              Remove
            </button>
          </div>
          <label class="upload">
            <input type="file" accept="image/*" @change="onCenterChange" />
            <div v-if="centerPreview" class="upload-preview">
              <img :src="centerPreview" alt="Center logo preview" />
            </div>
            <div v-else class="upload-empty">
              <strong>Drop or choose an image</strong>
              <span>PNG, JPG, WebP · shown in the middle</span>
            </div>
          </label>
          <label class="field slider">
            <span>Logo size · {{ centerScale }}%</span>
            <input v-model.number="centerScale" type="range" min="12" max="35" />
          </label>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Finder square marks</h2>
            <button
              v-if="finderFile"
              type="button"
              class="ghost"
              @click="clearFinder"
            >
              Remove
            </button>
          </div>
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
          <label class="upload">
            <input type="file" accept="image/*" @change="onFinderChange" />
            <div v-if="finderPreview" class="upload-preview">
              <img :src="finderPreview" alt="Finder mark preview" />
            </div>
            <div v-else class="upload-empty">
              <strong>Image for finder squares</strong>
              <span>Optional · applied to the selected corners</span>
            </div>
          </label>
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </section>

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
              @click="generate"
            >
              {{ loading ? 'Generating…' : 'Generate' }}
            </button>
            <button
              type="button"
              class="secondary"
              :disabled="!generated || !qrUrl"
              @click="download"
            >
              Download PNG
            </button>
          </div>
        </div>
      </section>
    </main>
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field span {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(11, 31, 26, 0.55);
}

textarea,
select,
input[type='color'] {
  border: 1px solid rgba(11, 31, 26, 0.14);
  background: rgba(255, 252, 245, 0.72);
  color: var(--ink);
  border-radius: 12px;
  padding: 0.85rem 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

textarea:focus,
select:focus,
input[type='color']:focus {
  outline: none;
  border-color: rgba(11, 31, 26, 0.45);
  box-shadow: 0 0 0 3px rgba(232, 255, 106, 0.45);
  background: #fffdf8;
}

textarea {
  resize: vertical;
  min-height: 5.5rem;
}

input[type='color'] {
  padding: 0.35rem;
  height: 3rem;
  cursor: pointer;
}

.row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.panel {
  padding: 1.1rem 0 0.2rem;
  border-top: 1px solid rgba(11, 31, 26, 0.1);
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}

.panel h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 500;
  letter-spacing: -0.02em;
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

.chip {
  border: 1px solid rgba(11, 31, 26, 0.16);
  background: transparent;
  color: var(--ink);
  border-radius: 999px;
  padding: 0.42rem 0.85rem;
  font-size: 0.88rem;
  font-weight: 500;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.chip:hover {
  border-color: rgba(11, 31, 26, 0.35);
  transform: translateY(-1px);
}

.chip.active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--signal);
}

.upload {
  position: relative;
  display: block;
  border: 1.5px dashed rgba(11, 31, 26, 0.22);
  border-radius: 16px;
  min-height: 7.5rem;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(232, 255, 106, 0.12), transparent 55%),
    rgba(255, 252, 245, 0.55);
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.25s ease;
}

.upload:hover {
  border-color: rgba(11, 31, 26, 0.45);
  transform: translateY(-2px);
}

.upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-empty,
.upload-preview {
  display: grid;
  place-items: center;
  min-height: 7.5rem;
  padding: 1rem;
  text-align: center;
}

.upload-empty {
  gap: 0.25rem;
}

.upload-empty strong {
  font-weight: 600;
}

.upload-empty span {
  font-size: 0.85rem;
  color: rgba(11, 31, 26, 0.55);
}

.upload-preview img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(11, 31, 26, 0.18);
}

.slider {
  margin-top: 0.85rem;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--ember);
}

.ghost {
  border: none;
  background: transparent;
  color: var(--ember);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0;
}

.ghost:hover {
  text-decoration: underline;
}

.error {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 107, 61, 0.12);
  color: #9a2f10;
  font-size: 0.92rem;
}

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
  background:
    linear-gradient(160deg, rgba(11, 31, 26, 0.92), rgba(26, 58, 49, 0.88));
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
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
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
  .page {
    width: min(100% - 1.5rem, 1120px);
    padding-top: 1.75rem;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .preview {
    position: static;
    order: -1;
  }

  .row {
    grid-template-columns: 1fr 1fr;
  }

  .row .field:last-child {
    grid-column: 1 / -1;
  }
}
</style>
