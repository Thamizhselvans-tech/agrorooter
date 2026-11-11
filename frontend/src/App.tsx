import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StandalonePredictor } from './components/StandalonePredictor';
import { CameraFeed } from './components/CameraFeed';
import { LatestPrediction } from './components/LatestPrediction';
import { TopPredictions } from './components/TopPredictions';
import { TreatmentCard } from './components/TreatmentCard';
import { RecentImages } from './components/RecentImages';
import { PredictionHistory } from './components/PredictionHistory';
import { SettingsModal } from './components/SettingsModal';
import { 
  Info, 
  X, 
  Leaf, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Radio, 
  Laptop,
  CheckCircle2
} from 'lucide-react';

import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord,
  SystemConnectionStatus,
  PredictionMode,
} from './types';
import { api } from './api/client';
import { connectionManager } from './api/connectionManager';
import { offlineStorage } from './api/storage';
import { standaloneEngine } from './ai/standaloneModel';
import {
  savePredictionToFirestore,
  subscribeToFirestorePredictions,
  updateRoverTelemetry,
} from './firebase/firestore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  // Dual Prediction Mode (Defaults to Standalone AI Mode)
  const [predictionMode, setPredictionMode] = useState<PredictionMode>(() =>
    offlineStorage.getPredictionMode()
  );

  // Standalone in-browser AI engine status
  const [standaloneModelLoaded, setStandaloneModelLoaded] = useState<boolean>(false);

  // Centralized Connection Status
  const [systemStatus, setSystemStatus] = useState<SystemConnectionStatus>(
    connectionManager.getStatus()
  );

  // System states
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<PredictResponse | null>(() =>
    offlineStorage.getCachedLatestPrediction()
  );
  const [predictionHistory, setPredictionHistory] = useState<PredictionRecord[]>(() =>
    offlineStorage.getCachedPredictions()
  );

  // Operational states
  const [autoCapture, setAutoCapture] = useState<boolean>(false);
  const [captureInterval, setCaptureInterval] = useState<number>(5);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userNotice, setUserNotice] = useState<{ message: string; actionText?: string; onAction?: () => void } | null>(null);

  // Track previous online state for auto-reconnect detection
  const wasOnlineRef = useRef<boolean>(false);

  // Initialize Standalone AI Model immediately on page load
  useEffect(() => {
    standaloneEngine
      .loadModel()
      .then((ready) => {
        setStandaloneModelLoaded(ready);
      })
      .catch((err) => {
        console.warn('Standalone model background load warning:', err);
      });
  }, []);

  // Sync mode changes to storage
  const handleModeChange = (mode: PredictionMode) => {
    setPredictionMode(mode);
    offlineStorage.setPredictionMode(mode);
  };

  // Load predictions safely (from API with offline fallback)
  const refreshPredictions = useCallback(async () => {
    try {
      const records = await api.getPredictions(50);
      if (records && records.length > 0) {
        setPredictionHistory(records);
        // If we don't have a latest prediction yet, reconstruct from latest history record
        setLatestPrediction((prev) => {
          if (prev) return prev;
          const latest = records[0];
          return {
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
            thumbnail_base64: latest.thumbnail_base64,
            timestamp: latest.timestamp,
            inference_time_ms: 22,
            disclaimer:
              'AI predictions are estimates based on computer vision models and do not substitute for certified agricultural inspection.',
          };
        });
      }
    } catch (e) {
      // Handled inside api.getPredictions()
    }
  }, []);

  // Subscribe to centralized connection manager
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((status) => {
      setSystemStatus(status);
      setHealth(status.health);
      setCameraStatus(status.cameraStatus);
      setModelInfo(status.modelInfo);

      // Auto-reconnect: if backend was offline and is now online
      if (!wasOnlineRef.current && status.isBackendConnected) {
        refreshPredictions();
        // Notify user about RPi availability without forcing an intrusive mode switch
        setUserNotice({
          message: 'Raspberry Pi backend detected online! You can switch to Mode B: Raspberry Pi IoT anytime.',
          actionText: 'Switch to IoT Mode',
          onAction: () => setPredictionMode('raspberry_pi'),
        });
      }
      wasOnlineRef.current = status.isBackendConnected;

      if (status.isCameraConnected) {
        updateRoverTelemetry({
          camera_connected: status.isCameraConnected,
          camera_streaming: status.isCameraStreaming,
          auto_capture: autoCapture,
        });
      }
    });

    // Start background health polling (12s interval)
    connectionManager.startPolling(12000);

    return () => {
      unsubscribe();
      connectionManager.stopPolling();
    };
  }, [autoCapture, refreshPredictions]);

  // Initial load of predictions
  useEffect(() => {
    refreshPredictions();
  }, [refreshPredictions]);

  // Real-time Cloud Firestore prediction sync
  useEffect(() => {
    const unsubscribe = subscribeToFirestorePredictions((records) => {
      if (records && records.length > 0) {
        setPredictionHistory((prev) => {
          if (prev.length === 0) {
            offlineStorage.setCachedPredictions(records);
            return records;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle successful Standalone Mode prediction
  const handleStandalonePrediction = (
    pred: PredictResponse,
    source: 'standalone_upload' | 'standalone_webcam'
  ) => {
    setLatestPrediction(pred);
    offlineStorage.setCachedLatestPrediction(pred);

    const record: PredictionRecord = {
      id: Date.now(),
      timestamp: pred.timestamp,
      predicted_class: pred.predicted_class,
      plant: pred.plant,
      disease: pred.disease,
      confidence: pred.confidence,
      is_tomato: pred.is_tomato,
      tomato_confidence: pred.is_tomato ? pred.confidence : null,
      top_predictions: pred.top_3_predictions,
      tomato_top_predictions: pred.top_3_tomato_predictions,
      thumbnail_base64: pred.thumbnail_base64,
      source: source === 'standalone_webcam' ? 'standalone_webcam' : 'standalone_upload',
    };

    const updated = offlineStorage.addPredictionRecord(record);
    setPredictionHistory(updated);

    // Sync to Cloud Firestore if connected
    savePredictionToFirestore(
      pred,
      source === 'standalone_webcam' ? 'camera_feed' : 'manual_upload'
    );
  };

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await connectionManager.checkConnection({ force: true });
      await refreshPredictions();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start Camera Handler for Raspberry Pi IoT Mode
  const handleStartCamera = async () => {
    if (!systemStatus.isRoverOnline) {
      setUserNotice({
        message: 'Raspberry Pi is currently offline. Connect your device to enable live camera streaming, or use Standalone Mode.',
        actionText: 'Switch to Standalone Mode',
        onAction: () => setPredictionMode('standalone'),
      });
      return;
    }

    try {
      setUserNotice(null);
      const res = await api.startCamera();
      if (!res.success) {
        setUserNotice({
          message: res.message || 'Webcam could not be started. Check USB connection on Raspberry Pi.',
        });
      }
      const status = await api.getCameraStatus();
      setCameraStatus(status);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Unable to start camera. Please verify USB webcam connection on Raspberry Pi.',
      });
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
      setUserNotice({
        message: err.message || 'Unable to stop camera.',
      });
    }
  };

  // Capture Now / Trigger Inference Handler for Raspberry Pi IoT Mode
  const handleCaptureNow = async () => {
    if (isInferencing) return;

    if (!systemStatus.isRoverOnline) {
      setUserNotice({
        message: 'Raspberry Pi is currently offline. Connect your device or switch to Standalone Mode to analyze leaves on your computer.',
        actionText: 'Switch to Standalone Mode',
        onAction: () => setPredictionMode('standalone'),
      });
      return;
    }

    setIsInferencing(true);
    setUserNotice(null);

    try {
      const pred = await api.predict();
      setLatestPrediction(pred);
      offlineStorage.setCachedLatestPrediction(pred);
      savePredictionToFirestore(pred, 'camera_feed');

      const record: PredictionRecord = {
        id: Date.now(),
        timestamp: pred.timestamp,
        predicted_class: pred.predicted_class,
        plant: pred.plant,
        disease: pred.disease,
        confidence: pred.confidence,
        is_tomato: pred.is_tomato,
        tomato_confidence: pred.is_tomato ? pred.confidence : null,
        top_predictions: pred.top_3_predictions,
        tomato_top_predictions: pred.top_3_tomato_predictions,
        image_url: pred.image_url,
        thumbnail_base64: pred.thumbnail_base64,
        source: 'raspberry_pi_camera',
      };
      const updated = offlineStorage.addPredictionRecord(record);
      setPredictionHistory(updated);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Prediction could not be completed at this time.',
      });
    } finally {
      setIsInferencing(false);
    }
  };

  // Manual Image Upload Handler for Raspberry Pi Mode fallback
  const handleUploadImageRPi = async (file: File) => {
    if (isInferencing) return;

    if (!systemStatus.isRoverOnline) {
      // In Standalone mode, upload works directly in browser!
      handleModeChange('standalone');
      setUserNotice({
        message: 'Switched to Standalone AI Mode to process your image locally in the browser.',
      });
      return;
    }

    setIsInferencing(true);
    setUserNotice(null);

    try {
      const pred = await api.predict(file);
      setLatestPrediction(pred);
      offlineStorage.setCachedLatestPrediction(pred);
      savePredictionToFirestore(pred, 'manual_upload');
      const hist = await api.getPredictions(50);
      setPredictionHistory(hist);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Leaf image prediction could not be processed on Raspberry Pi.',
      });
    } finally {
      setIsInferencing(false);
    }
  };

  // Statistics calculation for Dashboard
  const totalPredictionsCount = predictionHistory.length;
  const healthyCount = predictionHistory.filter((r) => r.disease.toLowerCase() === 'healthy').length;
  const diseasedCount = totalPredictionsCount - healthyCount;
  const tomatoCount = predictionHistory.filter((r) => r.is_tomato).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        predictionMode={predictionMode}
        setPredictionMode={handleModeChange}
        systemStatus={systemStatus}
        cameraStatus={cameraStatus}
        modelInfo={modelInfo}
        health={health}
        standaloneModelLoaded={standaloneModelLoaded}
      />

      {/* Main Content Pane with independent scrolling */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          predictionMode={predictionMode}
          setPredictionMode={handleModeChange}
          systemStatus={systemStatus}
          cameraStatus={cameraStatus}
          modelInfo={modelInfo}
          health={health}
          standaloneModelLoaded={standaloneModelLoaded}
          capturesCount={totalPredictionsCount}
          onRefresh={handleRefresh}
          isLoading={isRefreshing}
        />

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto">
          {/* Friendly Non-Alarming Action Notice */}
          {userNotice && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{userNotice.message}</span>
                {userNotice.actionText && userNotice.onAction && (
                  <button
                    onClick={() => {
                      userNotice.onAction?.();
                      setUserNotice(null);
                    }}
                    className="underline font-bold text-emerald-700 hover:text-emerald-900 ml-2 cursor-pointer"
                  >
                    {userNotice.actionText}
                  </button>
                )}
              </div>
              <button
                onClick={() => setUserNotice(null)}
                className="text-slate-400 hover:text-slate-600 shrink-0 ml-4 p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dynamic Tab Body */}
          <main className="p-6 space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Dashboard Metrics Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Predictions */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Total Diagnoses
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {totalPredictionsCount}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        Unified Records
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Healthy Leaves */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Healthy Leaves
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                        {healthyCount}
                      </span>
                      <span className="text-[10px] text-emerald-600/80 block mt-0.5 font-mono">
                        {totalPredictionsCount > 0
                          ? `${((healthyCount / totalPredictionsCount) * 100).toFixed(0)}% of total`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Diseased Leaves */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Diseased Leaves
                      </span>
                      <span className="text-2xl font-extrabold text-amber-600 tracking-tight">
                        {diseasedCount}
                      </span>
                      <span className="text-[10px] text-amber-600/80 block mt-0.5 font-mono">
                        {totalPredictionsCount > 0
                          ? `${((diseasedCount / totalPredictionsCount) * 100).toFixed(0)}% of total`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Active Prediction Mode */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Active Mode
                      </span>
                      <span className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mt-1">
                        {predictionMode === 'standalone' ? (
                          <>
                            <Laptop className="w-4 h-4 text-emerald-600" />
                            Standalone AI
                          </>
                        ) : (
                          <>
                            <Radio className="w-4 h-4 text-emerald-600" />
                            RPi IoT Mode
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {predictionMode === 'standalone' ? 'WebAssembly ONNX' : 'Logitech RPi Cam'}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleModeChange(
                          predictionMode === 'standalone' ? 'raspberry_pi' : 'standalone'
                        )
                      }
                      title="Switch Prediction Mode"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-colors cursor-pointer"
                    >
                      Switch
                    </button>
                  </div>
                </div>

                {/* Main Prediction Workspace (Dual Mode Switchable) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Image Source / Camera Viewport */}
                  <div className="lg:col-span-7">
                    {predictionMode === 'standalone' ? (
                      <StandalonePredictor
                        onPredictionComplete={handleStandalonePrediction}
                        isInferencing={isInferencing}
                        setIsInferencing={setIsInferencing}
                      />
                    ) : (
                      <CameraFeed
                        systemStatus={systemStatus}
                        cameraStatus={cameraStatus}
                        onStartCamera={handleStartCamera}
                        onStopCamera={handleStopCamera}
                        onCaptureNow={handleCaptureNow}
                        onUploadImage={handleUploadImageRPi}
                        isInferencing={isInferencing}
                        autoCapture={autoCapture}
                        setAutoCapture={setAutoCapture}
                        captureInterval={captureInterval}
                      />
                    )}
                  </div>

                  {/* Right Column: Latest Prediction & Confidence Distribution */}
                  <div className="lg:col-span-5 space-y-6">
                    <LatestPrediction
                      prediction={latestPrediction}
                      predictionMode={predictionMode}
                      modelLoaded={
                        predictionMode === 'standalone'
                          ? standaloneModelLoaded
                          : (modelInfo?.loaded ?? false)
                      }
                      isRoverConnected={systemStatus.isRoverOnline}
                      isInferencing={isInferencing}
                    />

                    {/* Top 3 Predictions Bar Chart */}
                    <TopPredictions prediction={latestPrediction} />
                  </div>
                </div>

                {/* Agronomic Disease Information & Recommended Treatment */}
                {latestPrediction && (
                  <TreatmentCard
                    diseaseName={latestPrediction.predicted_class}
                    confidence={latestPrediction.confidence}
                    plantName={latestPrediction.plant}
                    inferenceTimeMs={latestPrediction.inference_time_ms}
                    sourceMode={
                      predictionMode === 'standalone'
                        ? 'Mode A: Standalone In-Browser AI'
                        : 'Mode B: Raspberry Pi Edge IoT'
                    }
                  />
                )}

                {/* Bottom Row: Recent Captured Images Gallery */}
                <RecentImages
                  records={predictionHistory}
                  isRoverOnline={systemStatus.isRoverOnline}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <PredictionHistory
                records={predictionHistory}
                onRefresh={handleRefresh}
                isLoading={isRefreshing}
                isRoverOnline={systemStatus.isRoverOnline}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsModal
                predictionMode={predictionMode}
                setPredictionMode={handleModeChange}
                captureInterval={captureInterval}
                setCaptureInterval={setCaptureInterval}
                systemStatus={systemStatus}
                cameraStatus={cameraStatus}
                modelInfo={modelInfo}
                standaloneModelLoaded={standaloneModelLoaded}
                onConnectionUpdated={() => {
                  connectionManager.checkConnection({ force: true });
                  refreshPredictions();
                }}
                onClearHistory={() => {
                  setPredictionHistory([]);
                  setLatestPrediction(null);
                }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
