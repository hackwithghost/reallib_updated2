import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CheckCircle2, XCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type ScanResult = {
  seatNumber: string;
  studentName: string;
  rollNumber: string;
  status: string;
  alreadyMarked: boolean;
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("reallib_token") || ""}`,
  "Content-Type": "application/json",
});

function parseSeatId(text: string): number | null {
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/seat\/(\d+)/);
    if (match) return parseInt(match[1]);
  } catch {
    const n = parseInt(text);
    if (!isNaN(n)) return n;
  }
  return null;
}

export default function QrAttendanceScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const { toast } = useToast();

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const markAttendance = useCallback(async (seatId: number) => {
    setScanning(true);
    try {
      const seatRes = await fetch(`/api/reallib/seat/${seatId}`);
      if (!seatRes.ok) { toast({ title: "Seat not found", variant: "destructive" }); return; }
      const seatData = await seatRes.json();
      if (!seatData.currentAllocation) {
        toast({ title: `Seat ${seatData.seatNumber}: no student allocated right now`, variant: "destructive" });
        return;
      }
      const studentId = seatData.currentAllocation.studentId;
      const res = await fetch("/api/reallib/attendance/admin-mark", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ studentId, seatId }),
      });
      const data = await res.json();
      setLastResult({
        seatNumber: seatData.seatNumber,
        studentName: data.studentName,
        rollNumber: data.rollNumber,
        status: data.status,
        alreadyMarked: data.alreadyMarked,
      });
    } catch {
      toast({ title: "Failed to process QR code", variant: "destructive" });
    } finally {
      setScanning(false);
      // Allow re-scan of same QR after 3 seconds
      setTimeout(() => { lastScannedRef.current = null; }, 3000);
    }
  }, [toast]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      toast({ title: "Camera access denied", description: "Allow camera permission to scan QR codes.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    lastScannedRef.current = null;
  };

  useEffect(() => {
    if (!cameraActive) return;
    intervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data && code.data !== lastScannedRef.current) {
        lastScannedRef.current = code.data;
        const seatId = parseSeatId(code.data);
        if (seatId) markAttendance(seatId);
      }
    }, 400);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cameraActive, markAttendance]);

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {!cameraActive ? (
          <Button onClick={startCamera} className="gap-2">
            <Camera className="h-4 w-4" /> Start QR Scanner
          </Button>
        ) : (
          <Button variant="outline" onClick={stopCamera} className="gap-2">
            <XCircle className="h-4 w-4" /> Stop Camera
          </Button>
        )}
        {scanning && <span className="text-sm text-muted-foreground animate-pulse">Processing...</span>}
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black max-w-md border">
        <video ref={videoRef} className={`w-full aspect-video object-cover ${cameraActive ? "" : "hidden"}`} muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!cameraActive && (
          <div className="w-full aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted">
            <QrCode className="h-12 w-12 opacity-40" />
            <p className="text-sm">Click "Start QR Scanner" to begin</p>
          </div>
        )}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 border-2 border-white/30 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br" />
            </div>
          </div>
        )}
      </div>

      {lastResult && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${lastResult.alreadyMarked ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10" : "bg-green-50 border-green-200 dark:bg-green-900/10"}`}>
          <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${lastResult.alreadyMarked ? "text-yellow-600" : "text-green-600"}`} />
          <div>
            <p className="font-semibold text-sm">{lastResult.alreadyMarked ? "Already marked today" : "Attendance marked!"}</p>
            <p className="text-sm mt-0.5 text-muted-foreground">
              {lastResult.studentName} ({lastResult.rollNumber}) — Seat {lastResult.seatNumber}
            </p>
            {!lastResult.alreadyMarked && (
              <Badge className={`mt-1 text-xs ${lastResult.status === "present" ? "bg-green-100 text-green-800 border-green-300" : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
                {lastResult.status === "present" ? "Present" : "Late"}
              </Badge>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Point camera at a seat's QR code. The allocated student is marked present automatically.</p>
    </div>
  );
}
