import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { LatestPrediction } from './components/LatestPrediction';
import { TopPredictions } from './components/TopPredictions';
import { RecentImages } from './components/RecentImages';
import { PredictionHistory } from './components/PredictionHistory';
import { SettingsModal } from './components/SettingsModal';
import { Info, X } from 'lucide-react';

import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord,
  SystemConnectionStatus,
} from './types';
import { api } from './api/client';
import { connectionManager } from './api/connectionManager';
import { offlineStorage } from './api/storage';
import {
  savePredictionToFirestore,
  subscribeToFirestorePredictions,
  updateRoverTelemetry,
} from './firebase/firestore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

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
      // Offline fallback is already handled inside api.getPredictions()
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

  // Start Camera Handler
  const handleStartCamera = async () => {
    if (!systemStatus.isRoverOnline) {
      setUserNotice({
        message: 'Raspberry Pi is currently offline. Connect your device to enable camera streaming.',
        actionText: 'Configure Connection ⚙️',
        onAction: () => setActiveTab('settings'),
      });
      return;
    }

    try {
      setUserNotice(null);
      const res = await api.startCamera();
      if (!res.success) {
        setUserNotice({
          message: res.message || 'Webcam could not be started. Please check USB connection on Raspberry Pi.',
        });
      }
      const status = await api.getCameraStatus();
      setCameraStatus(status);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Unable to start camera. Please verify USB webcam connection.',
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

  // Capture Now / Trigger Inference Handler
  const handleCaptureNow = async () => {
    if (isInferencing) return;

    if (!systemStatus.isRoverOnline) {
      setUserNotice({
        message: 'Raspberry Pi is currently offline. Connect your device to enable live disease detection.',
        actionText: 'Configure Connection ⚙️',
        onAction: () => setActiveTab('settings'),
      });
      return;
    }

    setIsInferencing(true);
    setUserNotice(null);

    try {
      const pred = await api.predict();
      setLatestPrediction(pred);
      savePredictionToFirestore(pred, 'camera_feed');
      const hist = await api.getPredictions(50);
      setPredictionHistory(hist);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Prediction could not be completed at this time.',
        actionText: !systemStatus.isRoverOnline ? 'Configure Connection ⚙️' : undefined,
        onAction: !systemStatus.isRoverOnline ? () => setActiveTab('settings') : undefined,
      });
    } finally {
      setIsInferencing(false);
    }
  };

  // Manual Image Upload Handler
  const handleUploadImage = async (file: File) => {
    if (isInferencing) return;

    if (!systemStatus.isRoverOnline) {
      setUserNotice({
        message: 'Raspberry Pi is currently offline. Connect your device or start the backend to process leaf images.',
        actionText: 'Configure Connection ⚙️',
        onAction: () => setActiveTab('settings'),
      });
      return;
    }

    setIsInferencing(true);
    setUserNotice(null);

    try {
      const pred = await api.predict(file);
      setLatestPrediction(pred);
      savePredictionToFirestore(pred, 'manual_upload');
      const hist = await api.getPredictions(50);
      setPredictionHistory(hist);
    } catch (err: any) {
      setUserNotice({
        message: err.message || 'Leaf image prediction could not be processed.',
      });
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
        systemStatus={systemStatus}
        cameraStatus={cameraStatus}
        modelInfo={modelInfo}
        health={health}
      />

      {/* Main Content Pane with independent scrolling */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          systemStatus={systemStatus}
          cameraStatus={cameraStatus}
          modelInfo={modelInfo}
          health={health}
          capturesCount={health?.captures_count ?? predictionHistory.length}
          onRefresh={handleRefresh}
          isLoading={isRefreshing}
        />

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto">
          {/* Friendly Non-Alarming Action Notice */}
          {userNotice && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
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
                {/* Top Row: Camera Feed & Latest Prediction */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Live Camera Feed Card */}
                  <div className="lg:col-span-7">
                    <CameraFeed
                      systemStatus={systemStatus}
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
                      isRoverConnected={systemStatus.isRoverOnline}
                      isInferencing={isInferencing}
                    />

                    {/* Top 3 Predictions Bar Chart */}
                    <TopPredictions prediction={latestPrediction} />
                  </div>
                </div>

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
                captureInterval={captureInterval}
                setCaptureInterval={setCaptureInterval}
                systemStatus={systemStatus}
                cameraStatus={cameraStatus}
                modelInfo={modelInfo}
                onConnectionUpdated={() => {
                  connectionManager.checkConnection({ force: true });
                  refreshPredictions();
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
