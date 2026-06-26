import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FaceRegisterModal({ student, open, onClose, onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const [modelsReady, setModelsReady] = useState(modelsLoaded);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // Load models once
  useEffect(() => {
    if (!open) return;
    if (modelsLoaded) { setModelsReady(true); return; }
    loadModels()
      .then(() => setModelsReady(true))
      .catch(() => toast({ title: "Failed to load face models", variant: "destructive" }));
  }, [open]);

  // Start camera when models ready and dialog open
  useEffect(() => {
    if (!modelsReady || !open) return;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then(stream => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        streamRef.current = stream;
      })
      .catch(() => toast({ title: "Camera access denied", variant: "destructive" }));
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [modelsReady, open]);

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
        setStatusMsg("No face detected. Face the camera directly in good lighting.");
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
        setStatusMsg("Failed to save face data. Please try again.");
      } else {
        setStatus("success");
        setStatusMsg(`Face registered successfully for ${student.name}!`);
        setTimeout(() => { onSuccess(); onClose(); setStatus("idle"); }, 1500);
      }
    } catch {
      setStatus("error");
      setStatusMsg("An error occurred. Please try again.");
    } finally {
      setCapturing(false);
    }
  }, [student, onClose, onSuccess, modelsReady]);

  const handleClose = () => {
    setStatus("idle");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register Face — {student.name}</DialogTitle>
          <DialogDescription>
            Face the camera clearly, then click "Capture Face". Used for automatic face attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-black border aspect-video relative">
            {!modelsReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <p className="text-sm">Loading face models…</p>
              </div>
            )}
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {modelsReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-48 border-2 border-white/40 rounded-full" />
              </div>
            )}
          </div>

          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {statusMsg}
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {statusMsg}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={capturing}>Cancel</Button>
            <Button onClick={handleCapture} disabled={!modelsReady || capturing} className="gap-2">
              <Camera className="h-4 w-4" />
              {capturing ? "Detecting face…" : "Capture Face"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
