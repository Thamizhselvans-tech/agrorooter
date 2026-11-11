import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Camera, 
  Leaf, 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  Image as ImageIcon,
  AlertCircle,
  Cpu,
  Trash2
} from 'lucide-react';
import { LaptopWebcam } from './LaptopWebcam';
import { standaloneEngine } from '../ai/standaloneModel';
import { PredictResponse } from '../types';

interface StandalonePredictorProps {
  onPredictionComplete: (prediction: PredictResponse, source: 'standalone_upload' | 'standalone_webcam') => void;
  isInferencing: boolean;
  setIsInferencing: (val: boolean) => void;
}

export const StandalonePredictor: React.FC<StandalonePredictorProps> = ({
  onPredictionComplete,
  isInferencing,
  setIsInferencing,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'webcam'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorNotice(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorNotice('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorNotice(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorNotice('Please drop a valid image file.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Run In-Browser AI Inference on Uploaded Image
  const handleAnalyzeUploadedImage = async () => {
    if (!selectedFile && !selectedImage) return;
    setIsInferencing(true);
    setErrorNotice(null);

    try {
      const source = selectedFile || selectedImage!;
      const result = await standaloneEngine.predict(source, 'standalone_upload');
      onPredictionComplete(result, 'standalone_upload');
    } catch (err: any) {
      console.error('In-browser inference error:', err);
      setErrorNotice(err.message || 'Model prediction failed. Please retry with another photo.');
    } finally {
      setIsInferencing(false);
    }
  };

  // Run In-Browser AI Inference on Webcam Frame
  const handleAnalyzeWebcamFrame = async (canvas: HTMLCanvasElement) => {
    setIsInferencing(true);
    setErrorNotice(null);

    try {
      const result = await standaloneEngine.predict(canvas, 'standalone_webcam');
      onPredictionComplete(result, 'standalone_webcam');
    } catch (err: any) {
      console.error('Webcam inference error:', err);
      setErrorNotice(err.message || 'Webcam analysis failed. Please verify lighting and focus.');
    } finally {
      setIsInferencing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Card Header & Input Source Switcher */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Standalone AI Diagnostics</h3>
            <p className="text-[11px] text-slate-500">In-Browser MobileNetV2 Neural Network Engine</p>
          </div>
        </div>

        {/* Input Method Toggle */}
        <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => {
              setActiveInputTab('upload');
              setErrorNotice(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeInputTab === 'upload'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => {
              setActiveInputTab('webcam');
              setErrorNotice(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeInputTab === 'webcam'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Laptop Camera</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Error message if any */}
        {errorNotice && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-rose-600 hover:text-rose-900 font-bold text-xs ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: Upload Photo Mode */}
        {activeInputTab === 'upload' && (
          <div className="space-y-4">
            {!selectedImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-inner">
                  <Leaf className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Upload a Tomato Leaf Image
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Drag and drop a photo here, or click to browse files from your computer. Supports JPG, PNG, and WEBP.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  Select File from Computer
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview Container */}
                <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                  <img
                    src={selectedImage}
                    alt="Selected leaf specimen"
                    className="max-h-full max-w-full object-contain"
                  />

                  {/* Inferencing Loading Banner */}
                  {isInferencing && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center gap-2.5 text-white">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="text-sm font-semibold tracking-wide">
                        Running neural network inference in browser...
                      </span>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={handleClearImage}
                    disabled={isInferencing}
                    title="Remove and select another image"
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isInferencing}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium underline cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Choose different photo
                  </button>

                  <button
                    onClick={handleAnalyzeUploadedImage}
                    disabled={isInferencing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isInferencing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing Specimen...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4" />
                        Run AI Disease Detection
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Laptop Webcam Mode */}
        {activeInputTab === 'webcam' && (
          <LaptopWebcam
            onCaptureFrame={handleAnalyzeWebcamFrame}
            isInferencing={isInferencing}
          />
        )}
      </div>
    </div>
  );
};
