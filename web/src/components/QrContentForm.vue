<script setup lang="ts">
const value = defineModel<string>('value', { required: true });
const darkColor = defineModel<string>('darkColor', { required: true });
const lightColor = defineModel<string>('lightColor', { required: true });
const size = defineModel<number>('size', { required: true });
</script>

<template>
  <div class="content-form">
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
  </div>
</template>

<style scoped src="./controls.css"></style>

<style scoped>
.content-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

@media (max-width: 860px) {
  .row {
    grid-template-columns: 1fr 1fr;
  }

  .row .field:last-child {
    grid-column: 1 / -1;
  }
}
</style>
