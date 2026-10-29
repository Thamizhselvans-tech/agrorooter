import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";
import { db } from "./config";
import { PredictResponse, PredictionRecord } from "../types";

const PREDICTIONS_COLLECTION = "predictions";
const ROVER_STATUS_COLLECTION = "rover_status";

export interface FirestorePredictionDoc {
  id?: string;
  predicted_class: string;
  display_name: string;
  plant: string;
  disease: string;
  confidence: number;
  percentage: number;
  is_tomato: boolean;
  inference_time_ms: number;
  top_3_predictions: {
    class_name: string;
    display_name: string;
    confidence: number;
    percentage: number;
  }[];
  top_3_tomato_predictions: {
    class_name: string;
    display_name: string;
    confidence: number;
    percentage: number;
  }[];
  image_url?: string | null;
  image_filename?: string | null;
  thumbnail_base64?: string | null;
  source: "camera_feed" | "manual_upload" | "auto_capture";
  created_at: any;
  iso_timestamp: string;
}

/**
 * Saves a disease classification result to Cloud Firestore
 */
export async function savePredictionToFirestore(
  prediction: PredictResponse,
  source: "camera_feed" | "manual_upload" | "auto_capture" = "camera_feed"
): Promise<string | null> {
  try {
    const docData: FirestorePredictionDoc = {
      predicted_class: prediction.predicted_class,
      display_name: prediction.display_name,
      plant: prediction.plant,
      disease: prediction.disease,
      confidence: prediction.confidence,
      percentage: prediction.percentage,
      is_tomato: prediction.is_tomato,
      inference_time_ms: prediction.inference_time_ms,
      top_3_predictions: prediction.top_3_predictions.map((p) => ({
        class_name: p.class_name,
        display_name: p.display_name,
        confidence: p.confidence,
        percentage: p.percentage,
      })),
      top_3_tomato_predictions: prediction.top_3_tomato_predictions.map((p) => ({
        class_name: p.class_name,
        display_name: p.display_name,
        confidence: p.confidence,
        percentage: p.percentage,
      })),
      image_url: prediction.image_url || null,
      image_filename: prediction.image_filename || null,
      thumbnail_base64: prediction.thumbnail_base64 || null,
      source,
      created_at: serverTimestamp(),
      iso_timestamp: prediction.timestamp || new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, PREDICTIONS_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.warn("Failed to write prediction to Firestore:", error);
    return null;
  }
}

/**
 * Real-time listener for disease predictions
 */
export function subscribeToFirestorePredictions(
  onUpdate: (records: PredictionRecord[]) => void,
  maxResults = 25
): () => void {
  try {
    const q = query(
      collection(db, PREDICTIONS_COLLECTION),
      orderBy("created_at", "desc"),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: PredictionRecord[] = snapshot.docs.map((d, index) => {
          const data = d.data();
          const topPreds = (data.top_3_predictions || []).map((p: any, idx: number) => ({
            class_name: p.class_name || '',
            display_name: p.display_name || '',
            plant: data.plant || '',
            disease: data.disease || '',
            confidence: p.confidence || 0,
            percentage: p.percentage || Number(((p.confidence || 0) * 100).toFixed(1)),
            original_index: idx,
            is_tomato: !!data.is_tomato,
          }));

          const tomatoTopPreds = (data.top_3_tomato_predictions || []).map((p: any, idx: number) => ({
            class_name: p.class_name || '',
            display_name: p.display_name || '',
            plant: 'Tomato',
            disease: p.display_name || '',
            confidence: p.confidence || 0,
            percentage: p.percentage || Number(((p.confidence || 0) * 100).toFixed(1)),
            original_index: idx,
            is_tomato: true,
          }));

          return {
            id: index + 1,
            timestamp: data.iso_timestamp || new Date().toISOString(),
            predicted_class: data.predicted_class,
            plant: data.plant,
            disease: data.disease,
            confidence: data.confidence,
            is_tomato: !!data.is_tomato,
            tomato_confidence: data.is_tomato ? data.confidence : null,
            top_predictions: topPreds,
            tomato_top_predictions: tomatoTopPreds,
            image_filename: data.image_filename,
            image_url: data.image_url,
            thumbnail_base64: data.thumbnail_base64 || null,
            source: data.source || 'camera_feed',
          };
        });
        onUpdate(records);
      },
      (error) => {
        console.warn("Firestore onSnapshot error:", error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn("Could not subscribe to Firestore predictions:", error);
    return () => {};
  }
}

/**
 * Update the rover's live telemetry and connectivity state in Firestore
 */
export async function updateRoverTelemetry(status: {
  camera_connected: boolean;
  camera_streaming: boolean;
  auto_capture: boolean;
  battery_pct?: number;
  mode?: string;
}): Promise<void> {
  try {
    await setDoc(
      doc(db, ROVER_STATUS_COLLECTION, "rover-01"),
      {
        ...status,
        last_ping: serverTimestamp(),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Failed to update rover telemetry in Firestore:", error);
  }
}
