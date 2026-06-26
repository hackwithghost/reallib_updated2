import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

type DetectedStudent = { id: number; name: string; rollNumber: string; confidence: number };
type MarkedResult = { studentName: string; rollNumber: string; status: string; alreadyMarked: boolean };

let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsLoaded = true;
}

export default function FaceAttendanceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const matcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const studentMapRef = useRef<Map<string, { id: number; name: string; rollNumber: string }>>(new Map());
  const { toast } = useToast();

  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(modelsLoaded ? "ready" : "loading");
  const [cameraActive, setCameraActive] = useState(false);
  const [detected, setDetected] = useState<DetectedStudent | null>(null);
  const [lastMarked, setLastMarked] = useState<MarkedResult | null>(null);
  const [marking, setMarking] = useState(false);
  const [noFaces, setNoFaces] = useState(false);

  useEffect(() => {
    if (modelsLoaded) return;
    loadModels()
      .then(() => setModelStatus("ready"))
      .catch(() => setModelStatus("error"));
  }, []);

  const loadDescriptors = useCallback(async () => {
    const res = await fetch("/api/reallib/students/face-descriptors", {
      headers: { Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}` },
    });
    if (!res.ok) return false;
    const students: { id: number; name: string; rollNumber: string; faceDescriptor: string | null }[] = await res.json();
    const registered = students.filter(s => s.faceDescriptor);
    if (registered.length === 0) { setNoFaces(true); return false; }
    setNoFaces(false);
    studentMapRef.current = new Map(registered.map(s => [s.id.toString(), s]));
    const labeled = registered.map(s =>
      new faceapi.LabeledFaceDescriptors(s.id.toString(), [new Float32Array(JSON.parse(s.faceDescriptor!))])
    );
    matcherRef.current = new faceapi.FaceMatcher(labeled, 0.55);
    return true;
  }, []);

  const startCamera = async () => {
    if (modelStatus !== "ready") { toast({ title: "Models still loading, please wait", variant: "destructive" }); return; }
    const ok = await loadDescriptors();
    if (!ok && !noFaces) { toast({ title: "Failed to load face data", variant: "destructive" }); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      toast({ title: "Camera access denied", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setDetected(null);
  };

  useEffect(() => {
    if (!cameraActive) return;
    intervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !matcherRef.current) return;

      const dims = faceapi.matchDimensions(canvas, video, true);
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, dims);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      let best: DetectedStudent | null = null;
      for (const d of resized) {
        const match = matcherRef.current.findBestMatch(d.descriptor);
        faceapi.draw.drawDetections(canvas, [d]);
        const student = match.label !== "unknown" ? studentMapRef.current.get(match.label) : undefined;
        new faceapi.draw.DrawTextField(
          student ? [student.name, `${Math.round((1 - match.distance) * 100)}%`] : ["Unknown"],
          d.detection.box.topLeft
        ).draw(canvas);
        if (student && !best) {
          best = { ...student, confidence: Math.round((1 - match.distance) * 100) };
        }
      }
      setDetected(best);
    }, 800);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cameraActive]);

  useEffect(() => () => stopCamera(), []);

  const handleMark = async () => {
    if (!detected) return;
    setMarking(true);
    try {
      const allocRes = await fetch(`/api/reallib/allocations?studentId=${detected.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}` },
      });
      const allocs = await allocRes.json();
      const active = Array.isArray(allocs) ? allocs.find((a: any) => a.isActive) : null;
      if (!active) { toast({ title: `${detected.name} has no active seat allocation`, variant: "destructive" }); return; }

      const res = await fetch("/api/reallib/attendance/admin-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}` },
        body: JSON.stringify({ studentId: detected.id, seatId: active.seatId }),
      });
      const data = await res.json();
      setLastMarked({ studentName: data.studentName, rollNumber: data.rollNumber, status: data.status, alreadyMarked: data.alreadyMarked });
    } catch {
      toast({ title: "Failed to mark attendance", variant: "destructive" });
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {modelStatus === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Loading face recognition models…
          </div>
        )}
        {modelStatus === "error" && <p className="text-sm text-destructive">Failed to load models. Check internet connection.</p>}
        {modelStatus === "ready" && !cameraActive && (
          <Button onClick={startCamera} className="gap-2">
            <Camera className="h-4 w-4" /> Start Face Scanner
          </Button>
        )}
        {cameraActive && (
          <Button variant="outline" onClick={stopCamera} className="gap-2">
            <XCircle className="h-4 w-4" /> Stop Camera
          </Button>
        )}
      </div>

      {noFaces && modelStatus === "ready" && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-700">
          No student faces registered yet. Go to the <strong>Students</strong> page and click the 📷 button next to each student to register their face.
        </div>
      )}

      <div className="relative max-w-md rounded-xl overflow-hidden bg-black border">
        <video ref={videoRef} className={`w-full aspect-video object-cover ${cameraActive ? "" : "hidden"}`} muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: cameraActive ? "block" : "none" }} />
        {!cameraActive && (
          <div className="w-full aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted">
            <Users className="h-12 w-12 opacity-40" />
            <p className="text-sm">Camera not active</p>
          </div>
        )}
      </div>

      {detected && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5 gap-4">
          <div>
            <p className="font-semibold">{detected.name}</p>
            <p className="text-sm text-muted-foreground">{detected.rollNumber} · {detected.confidence}% match</p>
          </div>
          <Button onClick={handleMark} disabled={marking} size="sm">
            {marking ? "Marking…" : "Mark Present"}
          </Button>
        </div>
      )}

      {lastMarked && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${lastMarked.alreadyMarked ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10" : "bg-green-50 border-green-200 dark:bg-green-900/10"}`}>
          <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${lastMarked.alreadyMarked ? "text-yellow-600" : "text-green-600"}`} />
          <div>
            <p className="font-semibold text-sm">{lastMarked.alreadyMarked ? "Already marked today" : "Attendance marked!"}</p>
            <p className="text-sm mt-0.5 text-muted-foreground">{lastMarked.studentName} ({lastMarked.rollNumber})</p>
            {!lastMarked.alreadyMarked && (
              <Badge className={`mt-1 text-xs ${lastMarked.status === "present" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {lastMarked.status === "present" ? "Present" : "Late"}
              </Badge>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Face detection runs every 0.8s · Match threshold 55% · Register faces from the Students page
      </p>
    </div>
  );
}
