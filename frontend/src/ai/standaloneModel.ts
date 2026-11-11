import * as ort from 'onnxruntime-web';
import { PredictResponse, ClassPrediction, ModelInfo } from '../types';
import { getDiseaseDetails } from '../data/diseaseInfo';

// Configure ONNX Runtime Web WASM paths to use local bundle files
try {
  ort.env.wasm.wasmPaths = '/onnx-wasm/';
  // Disable multi-threading in environments that don't support SharedArrayBuffer
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
} catch (e) {
  console.warn('WASM configuration warning:', e);
}

const MODEL_PATH = '/models/plant_disease_model.onnx';
const LABELS_PATH = '/models/class_names.json';

class StandaloneInferenceEngine {
  private static instance: StandaloneInferenceEngine;
  private session: ort.InferenceSession | null = null;
  private classNames: string[] = [];
  private tomatoIndices: number[] = [];
  private isInitializing: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private loadError: string | null = null;

  private constructor() {}

  public static getInstance(): StandaloneInferenceEngine {
    if (!StandaloneInferenceEngine.instance) {
      StandaloneInferenceEngine.instance = new StandaloneInferenceEngine();
    }
    return StandaloneInferenceEngine.instance;
  }

  public isLoaded(): boolean {
    return this.session !== null && this.classNames.length > 0;
  }

  public getLoadError(): string | null {
    return this.loadError;
  }

  public async loadModel(): Promise<boolean> {
    if (this.isLoaded()) return true;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        // 1. Fetch class labels
        const labelsRes = await fetch(LABELS_PATH);
        if (!labelsRes.ok) {
          throw new Error(`Failed to load class names from ${LABELS_PATH}`);
        }
        const labelsData = await labelsRes.json();
        this.classNames = Array.isArray(labelsData)
          ? labelsData
          : labelsData.class_names || [];

        this.tomatoIndices = this.classNames
          .map((name, idx) => (name.toLowerCase().startsWith('tomato') ? idx : -1))
          .filter((idx) => idx !== -1);

        // 2. Load ONNX model session
        const sessionOptions: ort.InferenceSession.SessionOptions = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        };

        this.session = await ort.InferenceSession.create(MODEL_PATH, sessionOptions);
        this.loadError = null;
        console.log(
          `Standalone AI Engine Loaded: ${this.classNames.length} classes (${this.tomatoIndices.length} tomato classes)`
        );
        return true;
      } catch (err: any) {
        console.error('Failed to initialize Standalone AI Engine:', err);
        this.loadError = err.message || 'Model loading failed';
        return false;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  public getModelInfo(): ModelInfo {
    return {
      loaded: this.isLoaded(),
      model_name: 'Standalone MobileNetV2 Tomato Disease Classifier',
      architecture: 'MobileNetV2 (Client-Side ONNX / WebAssembly)',
      total_classes: this.classNames.length || 27,
      tomato_classes_count: this.tomatoIndices.length || 10,
      input_shape: [1, 3, 224, 224],
      input_dtype: 'float32',
      output_shape: [1, this.classNames.length || 27],
      output_dtype: 'float32',
      classes: this.classNames,
      tomato_classes: this.tomatoIndices.map((i) => this.classNames[i]),
      quantization: 'Float32 (Trained MobileNetV2 Architecture)',
      error: this.loadError,
    };
  }

  /**
   * Preprocess any HTML image, canvas, or file into an ONNX tensor with NCHW shape [1, 3, 224, 224]
   * and normalization: (pixel / 127.5) - 1.0 (range [-1.0, 1.0])
   */
  public async preprocessImage(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Blob | File | string
  ): Promise<{ tensor: ort.Tensor; base64Thumbnail: string }> {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    if (typeof source === 'string') {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image data into memory.'));
        img.src = source;
      });
      canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 224, 224);
    } else if (source instanceof HTMLCanvasElement) {
      canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0, 224, 224);
    } else if (source instanceof HTMLVideoElement || source instanceof HTMLImageElement) {
      canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0, 224, 224);
    } else {
      // Blob or File
      const img = new Image();
      const objectUrl = URL.createObjectURL(source);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image file into memory.'));
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 224, 224);
    }

    const base64Thumbnail = canvas.toDataURL('image/jpeg', 0.85);

    // Extract raw RGBA pixel data
    const imgData = ctx.getImageData(0, 0, 224, 224);
    const { data } = imgData;

    // Allocate Float32Array for NCHW [1, 3, 224, 224]
    const floatArray = new Float32Array(1 * 3 * 224 * 224);
    const planeSize = 224 * 224;

    // Convert and normalize: range [-1, 1]
    for (let i = 0; i < planeSize; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];

      floatArray[i] = r / 127.5 - 1.0; // Red plane
      floatArray[planeSize + i] = g / 127.5 - 1.0; // Green plane
      floatArray[planeSize * 2 + i] = b / 127.5 - 1.0; // Blue plane
    }

    const tensor = new ort.Tensor('float32', floatArray, [1, 3, 224, 224]);
    return { tensor, base64Thumbnail };
  }

  /**
   * Run actual AI model inference in browser
   */
  public async predict(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Blob | File | string,
    originLabel: 'standalone_upload' | 'standalone_webcam' = 'standalone_upload'
  ): Promise<PredictResponse> {
    const ready = await this.loadModel();
    if (!ready || !this.session) {
      throw new Error(this.loadError || 'In-browser AI inference engine is unavailable.');
    }

    const startTime = performance.now();

    // 1. Preprocess
    const { tensor, base64Thumbnail } = await this.preprocessImage(source);

    // 2. Run ONNX session
    const inputName = this.session.inputNames[0];
    const feeds = { [inputName]: tensor };
    const results = await this.session.run(feeds);
    const outputName = this.session.outputNames[0];
    const outputTensor = results[outputName];
    const rawScores = outputTensor.data as Float32Array;

    // 3. Compute calibrated Softmax probabilities
    const scores = Array.from(rawScores);
    const maxScore = Math.max(...scores);
    const expScores = scores.map((s) => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map((e) => e / sumExp);

    // 4. Map to class labels
    const allPredictions: ClassPrediction[] = probabilities.map((prob, idx) => {
      const rawLabel = this.classNames[idx] || `Class_${idx}`;
      let plant = 'Crop';
      let disease = rawLabel;

      if (rawLabel.includes(' - ')) {
        const parts = rawLabel.split(' - ');
        plant = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        disease = parts[1].replace(/_/g, ' ');
      } else if (rawLabel.includes('___')) {
        const parts = rawLabel.split('___');
        plant = parts[0];
        disease = parts[1].replace(/_/g, ' ');
      }

      const display_name = `${plant} ${disease}`;
      const is_tomato = this.tomatoIndices.includes(idx) || plant.toLowerCase() === 'tomato';

      return {
        class_name: rawLabel,
        display_name,
        plant,
        disease,
        confidence: Number(prob.toFixed(4)),
        percentage: Number((prob * 100).toFixed(2)),
        original_index: idx,
        is_tomato,
      };
    });

    // Sort descending by confidence
    const sortedAll = [...allPredictions].sort((a, b) => b.confidence - a.confidence);
    const topPrediction = sortedAll[0];
    const top3Overall = sortedAll.slice(0, 3);

    // Tomato specific ranking
    const tomatoOnly = allPredictions.filter((p) => p.is_tomato);
    const sortedTomato = [...tomatoOnly].sort((a, b) => b.confidence - a.confidence);
    const top3Tomato = sortedTomato.slice(0, 3);
    const tomatoSpecific = sortedTomato[0] || null;

    const inferenceTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      predicted_class: topPrediction.class_name,
      display_name: topPrediction.display_name,
      plant: topPrediction.plant,
      disease: topPrediction.disease,
      confidence: topPrediction.confidence,
      percentage: topPrediction.percentage,
      is_tomato: topPrediction.is_tomato,
      tomato_specific_prediction: tomatoSpecific,
      top_3_predictions: top3Overall,
      top_3_tomato_predictions: top3Tomato,
      thumbnail_base64: base64Thumbnail,
      timestamp: new Date().toISOString(),
      inference_time_ms: inferenceTimeMs,
      disclaimer:
        'AI predictions are generated directly in-browser using real trained MobileNetV2 neural network weights. Intended for agricultural guidance and diagnostic reference.',
    };
  }
}

export const standaloneEngine = StandaloneInferenceEngine.getInstance();
