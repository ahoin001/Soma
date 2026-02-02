import { useCallback, useEffect, useRef, useState } from "react";

type ScanState = "idle" | "starting" | "scanning" | "error";

type ScanResult = {
  rawValue: string;
  format?: string;
};

type UseBarcodeScannerOptions = {
  onDetected: (result: ScanResult) => void;
  onError?: (message: string) => void;
};

const supportsBarcodeDetector = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

export const useBarcodeScanner = ({
  onDetected,
  onError,
}: UseBarcodeScannerOptions) => {
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("idle");
    setMessage(null);
  }, []);

  const scanFrame = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const found = barcodes[0];
        onDetected({
          rawValue: found.rawValue,
          format: found.format,
        });
        stop();
        return;
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Scan failed";
      setState("error");
      setMessage(detail);
      onError?.(detail);
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onDetected, onError, stop]);

  const start = useCallback(async () => {
    if (!supportsBarcodeDetector()) {
      const detail = "Barcode scanning not supported on this device.";
      setMessage(detail);
      setState("error");
      onError?.(detail);
      return;
    }
    try {
      setState("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      detectorRef.current = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
      });
      setState("scanning");
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Camera permission denied";
      setMessage(detail);
      setState("error");
      onError?.(detail);
      stop();
    }
  }, [onError, scanFrame, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    message,
    start,
    stop,
    videoRef,
    supported: supportsBarcodeDetector(),
  };
};
