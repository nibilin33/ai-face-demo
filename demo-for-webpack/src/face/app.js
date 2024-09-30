import YOLOv5FaceDetector from './yolov5';
window.onload = () => {
  const inputElement = document.getElementById("imageUpload");
  const result = document.getElementById("result");
  const detector = new YOLOv5FaceDetector('model/ultra.onnx');
  inputElement.addEventListener("change", async (event) => {
    result.innerText = "开始检测...";
    const file = event.target.files[0];
    if (file) {
        await detector.loadModel(); // 加载模型
        const bboxes = await detector.detect(file); // 调用 YOLOv5 进行检测
        console.log(bboxes); // 输出检测到的边界框
        result.innerText = "检测完成，边界框信息已输出到控制台";
    }
  });
};