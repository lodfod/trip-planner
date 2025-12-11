import React, { useState, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Camera, Upload, Loader2, X, RotateCcw } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { parseReceiptWithVision, fileToBase64 } from "../../lib/openai";
import { ParsedReceipt, GroupMember, Currency } from "../../lib/types";
import { ItemSelector } from "./ItemSelector";

interface ReceiptOCRProps {
  groupMembers: GroupMember[];
  onExpenseData: (data: {
    name: string;
    total: number;
    currency: Currency;
    payerAmounts: Record<string, number>;
  }) => void;
}

type OCRState = "idle" | "capturing" | "preview" | "processing" | "results";

export function ReceiptOCR({ groupMembers, onExpenseData }: ReceiptOCRProps) {
  const [state, setState] = useState<OCRState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  // Start camera capture
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setState("capturing");
    } catch (err) {
      console.error("Camera access error:", err);
      setError(
        "Could not access camera. Please use file upload or grant camera permission."
      );
      toast({
        title: "Camera access denied",
        description: "Please use file upload instead.",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImagePreview(dataUrl);

    // Convert to File for processing
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "receipt.jpg", { type: "image/jpeg" });
          setImageFile(file);
        }
      },
      "image/jpeg",
      0.9
    );

    stopCamera();
    setState("preview");
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 20MB.",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setState("preview");
    };
    reader.readAsDataURL(file);
  };

  // Process receipt with OCR
  const processReceipt = async () => {
    if (!imageFile) return;

    setState("processing");
    setError(null);

    try {
      const base64 = await fileToBase64(imageFile);
      const result = await parseReceiptWithVision(base64, imageFile.type);
      setParsedReceipt(result);
      setState("results");

      toast({
        title: "Receipt processed",
        description: `Found ${result.items.length} items totaling ${
          result.currency === "JPY" ? "¥" : "$"
        }${result.total.toLocaleString()}`,
      });
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process receipt"
      );
      setState("preview");
      toast({
        title: "Processing failed",
        description:
          err instanceof Error ? err.message : "Failed to process receipt",
        variant: "destructive",
      });
    }
  };

  // Reset to initial state
  const reset = () => {
    stopCamera();
    setImagePreview(null);
    setImageFile(null);
    setParsedReceipt(null);
    setError(null);
    setState("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle item assignment completion
  const handleAssignmentComplete = (
    payerAmounts: Record<string, number>,
    totalWithExtras: number
  ) => {
    if (!parsedReceipt) return;

    onExpenseData({
      name: parsedReceipt.merchantName || "Receipt expense",
      total: totalWithExtras,
      currency: parsedReceipt.currency,
      payerAmounts,
    });

    toast({
      title: "Expense created",
      description: "The expense has been added from the receipt.",
    });

    reset();
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <Input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Idle State - Show options */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-4 py-6 px-4 border rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Take a photo of your receipt or upload an image
          </p>
          <div className="flex gap-3">
            <Button onClick={startCamera} variant="outline" size="sm">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Take Photo</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Upload Image</span>
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      )}

      {/* Capturing State - Camera view */}
      {state === "capturing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: "60vh" }}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button
                  onClick={() => {
                    stopCamera();
                    setState("idle");
                  }}
                  variant="outline"
                  className="bg-white/90"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="bg-white/90">
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview State - Show captured/uploaded image */}
      {state === "preview" && imagePreview && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <img
                src={imagePreview}
                alt="Receipt preview"
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: "50vh" }}
              />
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <div className="flex justify-center gap-4">
                <Button onClick={reset} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button onClick={processReceipt}>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Process Receipt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {state === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing receipt...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take a few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results State - Show item selector */}
      {state === "results" && parsedReceipt && (
        <ItemSelector
          receipt={parsedReceipt}
          groupMembers={groupMembers}
          onComplete={handleAssignmentComplete}
          onCancel={reset}
        />
      )}
    </div>
  );
}
