import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { LatestPrediction } from './components/LatestPrediction';
import { TopPredictions } from './components/TopPredictions';
import { RecentImages } from './components/RecentImages';
import { PredictionHistory } from './components/PredictionHistory';
import { SettingsModal } from './components/SettingsModal';

import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord
} from './types';
import { api } from './api/client';
import {
  savePredictionToFirestore,
  subscribeToFirestorePredictions,
  updateRoverTelemetry
} from './firebase/firestore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  // System states
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<PredictResponse | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionRecord[]>([]);

  // Operational states
  const [autoCapture, setAutoCapture] = useState<boolean>(false);
  const [captureInterval, setCaptureInterval] = useState<number>(5);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial system states
  const fetchSystemStatus = useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const [h, cam, mod, hist] = await Promise.allSettled([
        api.getHealth(),
        api.getCameraStatus(),
        api.getModelInfo(),
        api.getPredictions(50),
      ]);

      if (h.status === 'fulfilled') setHealth(h.value);
      if (cam.status === 'fulfilled') {
        setCameraStatus(cam.value);
        updateRoverTelemetry({
          camera_connected: cam.value.connected,
          camera_streaming: cam.value.streaming,
          auto_capture: autoCapture,
        });
      }
      if (mod.status === 'fulfilled') setModelInfo(mod.value);
      if (hist.status === 'fulfilled') {
        setPredictionHistory(hist.value);
        // If we don't have a latest prediction yet, reconstruct from latest history record if available
        if (hist.value.length > 0 && !latestPrediction) {
          const latest = hist.value[0];
          setLatestPrediction({
            success: true,
            predicted_class: latest.predicted_class,
            display_name: `${latest.plant} ${latest.disease}`,
            plant: latest.plant,
            disease: latest.disease,
            confidence: latest.confidence,
            percentage: Number((latest.confidence * 100).toFixed(2)),
            is_tomato: latest.is_tomato,
            tomato_specific_prediction: latest.tomato_top_predictions?.[0] || null,
            top_3_predictions: latest.top_predictions.slice(0, 3),
            top_3_tomato_predictions: latest.tomato_top_predictions?.slice(0, 3) || [],
            image_filename: latest.image_filename,
            image_url: latest.image_url,
            timestamp: latest.timestamp,
            inference_time_ms: 22,
            disclaimer:
              'AI predictions are estimates based on computer vision models and do not substitute for certified agricultural inspection.',
          });
        }
      }
    } catch (e: any) {
      console.error('Error fetching system status:', e);
    } finally {
      setIsLoadingHealth(false);
    }
  }, [latestPrediction]);

  // Periodic health polling (every 6 seconds)
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 6000);
    return () => clearInterval(interval);
  }, [fetchSystemStatus]);

  // Real-time Cloud Firestore prediction sync
  useEffect(() => {
    const unsubscribe = subscribeToFirestorePredictions((records) => {
      if (records.length > 0) {
        setPredictionHistory((prev) => {
          // If local history is empty, populate with cloud records
          if (prev.length === 0) return records;
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Start Camera Handler
  const handleStartCamera = async () => {
    try {
      setErrorMessage(null);
      await api.startCamera();
      const status = await api.getCameraStatus();
      setCameraStatus(status);
    } catch (err: any) {
      setErrorMessage(`Camera Start Failed: ${err.message}`);
    }
  };

  // Stop Camera Handler
  const handleStopCamera = async () => {
    try {
      setAutoCapture(false);
      await api.stopCamera();
      const status = await api.getCameraStatus();
      setCameraStatus(status);
    } catch (err: any) {
      setErrorMessage(`Camera Stop Failed: ${err.message}`);
    }
  };

  // Capture Now / Trigger Inference Handler
  const handleCaptureNow = async () => {
    if (isInferencing) return; // Prevent overlapping requests
    setIsInferencing(true);
    setErrorMessage(null);

    try {
      const pred = await api.predict();
      setLatestPrediction(pred);
      // Sync prediction to Cloud Firestore
      savePredictionToFirestore(pred, 'camera_feed');
      // Refresh history log
      const hist = await api.getPredictions(50);
      setPredictionHistory(hist);
    } catch (err: any) {
      console.error('Inference error:', err);
      setErrorMessage(err.message || 'Inference failed');
    } finally {
      setIsInferencing(false);
    }
  };

  // Manual Image Upload Handler
  const handleUploadImage = async (file: File) => {
    if (isInferencing) return;
    setIsInferencing(true);
    setErrorMessage(null);

    try {
      const pred = await api.predict(file);
      setLatestPrediction(pred);
      // Sync prediction to Cloud Firestore
      savePredictionToFirestore(pred, 'manual_upload');
      // Refresh history log
      const hist = await api.getPredictions(50);
      setPredictionHistory(hist);
    } catch (err: any) {
      console.error('Upload inference error:', err);
      setErrorMessage(err.message || 'Image prediction failed');
    } finally {
      setIsInferencing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900">
      {/* Sidebar Navigation - Fixed & Static */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cameraStatus={cameraStatus}
        modelInfo={modelInfo}
        health={health}
      />

      {/* Main Content Pane with independent scrolling */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          cameraStatus={cameraStatus}
          modelInfo={modelInfo}
          health={health}
          capturesCount={health?.captures_count ?? predictionHistory.length}
          onRefresh={fetchSystemStatus}
          isLoading={isLoadingHealth}
        />

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto">
          {/* Global Error Notice if any */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">{errorMessage}</span>
                {errorMessage.includes('Settings') && (
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setErrorMessage(null);
                    }}
                    className="underline font-bold text-rose-900 hover:text-black ml-2"
                  >
                    Open Settings ⚙️
                  </button>
                )}
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 font-bold hover:underline shrink-0 ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Dynamic Tab Body */}
          <main className="p-6 space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Top Row: Camera Feed & Latest Prediction */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Live Camera Feed Card */}
                  <div className="lg:col-span-7">
                    <CameraFeed
                      cameraStatus={cameraStatus}
                      onStartCamera={handleStartCamera}
                      onStopCamera={handleStopCamera}
                      onCaptureNow={handleCaptureNow}
                      onUploadImage={handleUploadImage}
                      isInferencing={isInferencing}
                      autoCapture={autoCapture}
                      setAutoCapture={setAutoCapture}
                      captureInterval={captureInterval}
                    />
                  </div>

                  {/* Latest Prediction Card */}
                  <div className="lg:col-span-5 space-y-6">
                    <LatestPrediction
                      prediction={latestPrediction}
                      modelLoaded={modelInfo?.loaded ?? false}
                      isInferencing={isInferencing}
                    />

                    {/* Top 3 Predictions Bar Chart */}
                    <TopPredictions prediction={latestPrediction} />
                  </div>
                </div>

                {/* Bottom Row: Recent Captured Images Gallery */}
                <RecentImages records={predictionHistory} />
              </div>
            )}

            {activeTab === 'history' && (
              <PredictionHistory
                records={predictionHistory}
                onRefresh={fetchSystemStatus}
                isLoading={isLoadingHealth}
              />
            )}


            {activeTab === 'settings' && (
              <SettingsModal
                captureInterval={captureInterval}
                setCaptureInterval={setCaptureInterval}
                cameraStatus={cameraStatus}
                modelInfo={modelInfo}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
