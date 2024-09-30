<script setup>
import { ref } from 'vue';
import YOLOv5FaceDetector from './yolov5';

const imageFile = ref(null);
const detector = new YOLOv5FaceDetector('ultra.onnx');
const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
        imageFile.value = URL.createObjectURL(file);
        await detector.loadModel();
        const bboxes = await detector.detect(file);
        console.log(bboxes); // 输出检测到的边界框
    }
};
</script>

<template>
  <div>
    <input type="file" @change="handleFileChange" accept="image/*" />
    <img v-if="imageFile" :src="imageFile" alt="Uploaded Image" />
    <canvas id="canvas"></canvas>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
