import * as ort from 'onnxruntime-web';
import ndarray from "ndarray";

export default class YOLOv5FaceDetector {
    constructor(modelPath, numThreads = 1) {
      this.modelPath = modelPath;
      this.numThreads = numThreads;
      this.session = null;
      this.inputWidth = 480; // 需要根据模型设置
      this.inputHeight = 640; // 需要根据模型设置
      this.meanVals = [0, 0, 0]; // RGB
      this.normVals = [1/255, 1/255, 1/255];
      this.maxNMS = 30000;
      this.outputShape = []; // 需要根据模型设置
    }
  
    async loadModel() {
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['webgl','cpu'],
      });
    }
    preprocess(image) {
        const img = new Image();
        img.src = URL.createObjectURL(image);
        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.getElementById('canvas');
                const context = canvas.getContext('2d');
                canvas.width = this.inputWidth;
                canvas.height = this.inputHeight;
            
                // Resize image while maintaining aspect ratio
                const scale = Math.min(this.inputWidth / img.width, this.inputHeight / img.height);
                const scaledWidth = Math.round(img.width * scale);
                const scaledHeight = Math.round(img.height * scale);
                const dx = Math.floor((this.inputWidth - scaledWidth) / 2);
                const dy = Math.floor((this.inputHeight - scaledHeight) / 2);
                // Fill canvas with black and draw resized image
                context.fillStyle = 'black';
                context.fillRect(0, 0, this.inputWidth, this.inputHeight);
                context.drawImage(img, dx, dy, scaledWidth, scaledHeight);
            
                const {data} = context.getImageData(0, 0, this.inputWidth, this.inputHeight);
                const dataTensor = ndarray(new Float32Array(data), [this.inputWidth, this.inputHeight, 4]);
                const dataProcessedTensor = ndarray(new Float32Array(this.inputWidth * this.inputHeight * 3), [
                    1,
                    3,
                    this.inputWidth,
                    this.inputHeight,
                  ]);
                  // 将图像数据从RGBA格式转换为RGB格式，并归一化到[0, 1]范围内
                  for (let y = 0; y < this.inputHeight; y++) {
                    for (let x = 0; x < this.inputWidth; x++) {
                        for (let c = 0; c < 3; c++) {
                            dataProcessedTensor.set(0, c, x, y, dataTensor.get(x, y, c) / 255);
                        }
                    }
                  }
                resolve({
                    float32Data: dataProcessedTensor.data,
                    width: this.inputWidth,
                    height: this.inputHeight
                });
            }
        }); 
    }
    preprocessImage(image) {
        const img = new Image();
        img.src = URL.createObjectURL(image);
        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.getElementById('canvas');
                const context = canvas.getContext('2d');
                canvas.width = this.inputWidth;
                canvas.height = this.inputHeight;
            
                // Resize image while maintaining aspect ratio
                const scale = Math.min(this.inputWidth / img.width, this.inputHeight / img.height);
                const scaledWidth = Math.round(img.width * scale);
                const scaledHeight = Math.round(img.height * scale);
                const dx = Math.floor((this.inputWidth - scaledWidth) / 2);
                const dy = Math.floor((this.inputHeight - scaledHeight) / 2);
                // Fill canvas with black and draw resized image
                context.fillStyle = 'black';
                context.fillRect(0, 0, this.inputWidth, this.inputHeight);
                context.drawImage(img, dx, dy, scaledWidth, scaledHeight);
                // 实现图像归一化的标准差值，输出 RGB格式
                const imageData = context.getImageData(0, 0, this.inputWidth, this.inputHeight);
                const data = imageData.data;
                const float32Data = new Float32Array(this.inputWidth * this.inputHeight * 3);

                for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
                  float32Data[j] = (data[i] - this.meanVals[0]) * this.normVals[0];
                  float32Data[j + 1] = (data[i + 1] - this.meanVals[1]) * this.normVals[1];
                  float32Data[j + 2] = (data[i + 2] - this.meanVals[2]) * this.normVals[2];
                }
                resolve({
                    float32Data: float32Data,
                    width: img.width,
                    height: img.height,
                });
            }
        });
    
      }
    async detect(image, scoreThreshold = 0.3, iouThreshold = 0.45, topk = 400) {
      if (!this.session) {
        throw new Error("Model not loaded, call loadModel() first.");
      }
  
      const { float32Data, width, height } = await this.preprocess(image);
      const inputTensor = new ort.Tensor("float32", new Float32Array(this.inputWidth * this.inputHeight * 3), [
        1,
        3,
        this.inputWidth,
        this.inputHeight,
      ]);
      inputTensor.data.set(float32Data);
      const feeds = {[this.session.inputNames[0]]: inputTensor };
      const results = await this.session.run(feeds);
      const output = results[this.session.outputNames[0]]
      this.outputShape = output.dims;
      console.log("模型输出数据",output);
      // 遍历输出数据，提取边界框信息
      const bboxes = this.postprocess(output.data, scoreThreshold, iouThreshold, topk, this.inputWidth, this.inputHeight, width, height);
      return bboxes;
    }
    postprocess(output, scoreThreshold, iouThreshold, topk, inputWidth, inputHeight, origWidth, origHeight) {
        const bboxes = [];
        const numDetections = this.outputShape[1];
        for (let i = 0; i < numDetections; i++) {
            const offset = i * 16;
            const score = output[offset + 4];// 目标置信度
            if(score < scoreThreshold) continue;
            const clsConf = output[offset + 15]; // 类别置信度
            if(clsConf < scoreThreshold) continue;
            const cx = output[offset];
            const cy = output[offset + 1];
            const w = output[offset + 2];
            const h = output[offset + 3];

            const x1 = (cx - w / 2) * (origWidth / inputWidth);
            const y1 = (cy - h / 2) * (origHeight / inputHeight);
            const x2 = (cx + w / 2) * (origWidth / inputWidth);
            const y2 = (cy + h / 2) * (origHeight / inputHeight);
      
            const landmarks = [];
            for (let j = 0; j < 5; j++) {
              const lx = output[offset + 5 + j * 2] * (origWidth / inputWidth);
              const ly = output[offset + 6 + j * 2] * (origHeight / inputHeight);
              landmarks.push({ x: lx, y: ly });
            }
            if(typeof score !== 'undefined') {
              bboxes.push({ x1, y1, x2, y2, score, landmarks });
            }
          }
        return this.nonMaxSuppression(bboxes, iouThreshold, topk);
      }
      nonMaxSuppression(bboxes, iouThreshold, topk) {
        bboxes.sort((a, b) => b.score - a.score);
        const selectedBboxes = [];
    
        const iou = (boxA, boxB) => {
          const x1 = Math.max(boxA.x1, boxB.x1);
          const y1 = Math.max(boxA.y1, boxB.y1);
          const x2 = Math.min(boxA.x2, boxB.x2);
          const y2 = Math.min(boxA.y2, boxB.y2);
    
          const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
          const boxAArea = (boxA.x2 - boxA.x1) * (boxA.y2 - boxA.y1);
          const boxBArea = (boxB.x2 - boxB.x1) * (boxB.y2 - boxB.y1);
    
          return interArea / (boxAArea + boxBArea - interArea);
        };
    
        while (bboxes.length > 0 && selectedBboxes.length < topk) {
          const bestBox = bboxes.shift();
          selectedBboxes.push(bestBox);
    
          bboxes = bboxes.filter(box => iou(bestBox, box) < iouThreshold);
        }
        console.log(selectedBboxes.length);
        return selectedBboxes;
      }
    
  }