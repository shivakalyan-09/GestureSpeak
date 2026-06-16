import { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography, LinearProgress, Paper } from '@mui/material';
import { PlayArrow as StartIcon, Stop as StopIcon } from '@mui/icons-material';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface CameraSignDetectionProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (sequences: number[][]) => void;
}

export default function CameraSignDetection({
  isRecording,
  onStartRecording,
  onStopRecording,
}: CameraSignDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [loadingLandmarker, setLoadingLandmarker] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  
  const sequenceBufferRef = useRef<number[][]>([]);
  const isRecordingRef = useRef(isRecording);
  const animationFrameIdRef = useRef<number | null>(null);

  // Sync isRecording ref
  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (isRecording) {
      sequenceBufferRef.current = [];
      setFrameCount(0);
    }
  }, [isRecording]);

  // Load MediaPipe Landmarker
  useEffect(() => {
    async function initMediaPipe() {
      try {
        setLoadingLandmarker(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setLandmarker(handLandmarkerInstance);
        setLoadingLandmarker(false);
      } catch (err) {
        console.error("Failed to load MediaPipe Hand Landmarker:", err);
        setError("Could not load MediaPipe models. Falling back to camera only.");
        setLoadingLandmarker(false);
      }
    }
    initMediaPipe();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Set up camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false
        });
        
        if (!isMounted) {
          userStream.getTracks().forEach(track => track.stop());
          return;
        }

        stream = userStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              if (error.name !== "AbortError") {
                console.error("Video play failed:", error);
              }
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Camera access denied:", err);
          setError("Webcam access denied. Please grant permission.");
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Real-time loop
  useEffect(() => {
    if (loadingLandmarker || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const processVideoFrame = () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);
        return;
      }

      if (landmarker && canvas && ctx) {
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        // Skip processing if video dimensions are not yet loaded
        if (videoWidth <= 0 || videoHeight <= 0) {
          animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);
          return;
        }

        // Adjust canvas dimensions
        if (canvas.width !== videoWidth) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        try {
          const timestamp = performance.now();
          const results = landmarker.detectForVideo(videoRef.current, timestamp);

          // Draw skeleton lines if hands are found
          if (results.landmarks && results.landmarks.length > 0) {
            drawHandSkeleton(ctx, results.landmarks);

            // Construct 126-element float array (63 per hand: x, y, z for 21 points)
            const landmarkArray = new Array(126).fill(0.0);
            let index = 0;

            for (const hand of results.landmarks) {
              for (const landmark of hand) {
                if (index + 2 < 126) {
                  // Invert X for mirroring webcam correctly
                  landmarkArray[index++] = 1.0 - landmark.x;
                  landmarkArray[index++] = landmark.y;
                  landmarkArray[index++] = landmark.z;
                }
              }
            }

            // If recording, store frame
            if (isRecordingRef.current) {
              if (sequenceBufferRef.current.length < 50) {
                sequenceBufferRef.current.push(landmarkArray);
                setFrameCount(sequenceBufferRef.current.length);

                // Auto stop when 50 frames are collected
                if (sequenceBufferRef.current.length === 50) {
                  const seq = [...sequenceBufferRef.current];
                  setTimeout(() => {
                    onStopRecording(seq);
                  }, 100);
                }
              }
            }
          }
        } catch (e) {
          console.error("Frame analysis failed:", e);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(processVideoFrame);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [landmarker, loadingLandmarker]);

  // Draw MediaPipe hands on canvas
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarksList: any[][]) => {
    landmarksList.forEach((landmarks) => {
      ctx.fillStyle = '#00f2fe';
      ctx.strokeStyle = '#ec38bc';
      ctx.lineWidth = 3;

      // Draw Connection lines matching joints
      // Connections list (wrist to thumb, index, middle, ring, pinky)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [5, 9], [9, 10], [10, 11], [11, 12], // Middle
        [9, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17] // Palm bridge
      ];

      const w = ctx.canvas.width;
      const h = ctx.canvas.height;

      connections.forEach(([p1, p2]) => {
        const pt1 = landmarks[p1];
        const pt2 = landmarks[p2];
        if (pt1 && pt2) {
          ctx.beginPath();
          ctx.moveTo(pt1.x * w, pt1.y * h);
          ctx.lineTo(pt2.x * w, pt2.y * h);
          ctx.stroke();
        }
      });

      // Draw joint dots
      landmarks.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const handleStart = () => {
    onStartRecording();
  };

  const handleStop = () => {
    onStopRecording(sequenceBufferRef.current);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {error && (
        <Paper color="error" sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxHeight: 460,
          aspectRatio: '4/3',
          overflow: 'hidden',
          borderRadius: '24px',
          border: '2px solid var(--border-glass)',
          background: '#000000',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Webcam View */}
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirror preview
          }}
          muted
          playsInline
        />

        {/* MediaPipe Skeleton Overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            transform: 'scaleX(-1)' // Mirror tracking
          }}
        />

        {/* Model Loading Spinner */}
        {loadingLandmarker && (
          <Box
            sx={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
              color: '#ffffff',
            }}
          >
            <CircularProgress color="inherit" size={44} />
            <Typography variant="caption" sx={{ mt: 1.5, fontWeight: 700, letterSpacing: 0.5 }}>
              INITIALIZING AI HAND TRACKER...
            </Typography>
          </Box>
        )}

        {/* Scan line effect when active */}
        {isRecording && <Box className="scanning-line" sx={{ top: 0 }} />}
      </Box>

      {/* Frame Queue Progress Bar */}
      {isRecording && (
        <Box sx={{ mt: 2, px: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
              CAPTURNG GESTURE FRAMES
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {frameCount} / 50
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(frameCount / 50) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundImage: 'linear-gradient(90deg, #00f2fe 0%, #ec38bc 100%)',
              },
            }}
          />
        </Box>
      )}

      {/* Control Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
        {!isRecording ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<StartIcon />}
            onClick={handleStart}
            disabled={loadingLandmarker}
            sx={{
              borderRadius: '16px',
              px: 4,
              py: 1.5,
              fontWeight: 800,
              boxShadow: '0 4px 14px 0 rgba(1, 134, 218, 0.35)',
            }}
          >
            START RECORDING
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStop}
            sx={{
              borderRadius: '16px',
              px: 4,
              py: 1.5,
              fontWeight: 800,
              boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.35)',
            }}
          >
            STOP SESSION
          </Button>
        )}
      </Box>
    </Box>
  );
}
