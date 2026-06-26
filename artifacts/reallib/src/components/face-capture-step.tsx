import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle2, AlertCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsLoaded = true;
}

interface Props {
  student: { id: number; name: string; rollNumber: string };
  onDone: () => void;
}

export default function FaceCaptureStep({ student, onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const [modelsReady, setModelsReady] = useState(modelsLoaded);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadModels().then(() => {
      if (!cancelled) setModelsReady(true);
    }).catch(() => {
      if (!cancelled) toast({ title: "Failed to load face models", variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!modelsReady) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        streamRef.current = stream;
        setCameraReady(true);
      })
      .catch(() => toast({ title: "Camera access denied", variant: "destructive" }));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [modelsReady]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !modelsReady) return;
    setCapturing(true);
    setStatus("idle");
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setStatus("error");
        setStatusMsg("No face detected. Face the camera directly in good lighting and try again.");
        setCapturing(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const res = await fetch(`/api/reallib/students/${student.id}/face`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}`,
        },
        body: JSON.stringify({ descriptor }),
      });

      if (!res.ok) {
        setStatus("error");
        setStatusMsg("Failed to save face data. You can register it later from the Students page.");
      } else {
        setStatus("success");
        setStatusMsg("Face registered successfully!");
        setTimeout(onDone, 1200);
      }
    } catch {
      setStatus("error");
      setStatusMsg("An error occurred. You can register the face later from the Students page.");
    }
    setCapturing(false);
  }, [student.id, modelsReady, onDone]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden bg-black border aspect-video max-w-md relative">
        {!modelsReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black">
            <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-sm">Loading face detection models…</p>
          </div>
        )}
        {modelsReady && !cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            Starting camera…
          </div>
        )}
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-44 border-2 border-white/40 rounded-full" />
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg max-w-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {statusMsg}
        </div>
      )}
      {status === "success" && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg max-w-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {statusMsg}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onDone} disabled={capturing} className="gap-2">
          <SkipForward className="h-4 w-4" />
          Skip for now
        </Button>
        <Button onClick={handleCapture} disabled={!modelsReady || !cameraReady || capturing} className="gap-2">
          <Camera className="h-4 w-4" />
          {capturing ? "Detecting face…" : "Capture Face"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">You can always register or update the face later from the Students page.</p>
    </div>
  );
}
