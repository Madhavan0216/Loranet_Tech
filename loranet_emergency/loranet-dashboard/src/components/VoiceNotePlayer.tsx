import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Sparkles, AlertTriangle, Users, Stethoscope, Compass } from 'lucide-react';
import type { VoiceData } from '../data/demo';
import { playSyntheticRadioChirp, speakText, stopSpeech } from '../utils/audioUtils';

interface VoiceNotePlayerProps {
  voiceData: VoiceData;
  compact?: boolean;
  showTriage?: boolean;
}

export default function VoiceNotePlayer({
  voiceData,
  compact = false,
  showTriage = true,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopSynthRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const duration = voiceData.duration || 6.0;

  useEffect(() => {
    return () => {
      if (stopSynthRef.current) stopSynthRef.current();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopSpeech();
    };
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if (stopSynthRef.current) {
        stopSynthRef.current();
        stopSynthRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);

    if (voiceData.audioUrl) {
      // Real recorded audio element
      if (!audioRef.current) {
        audioRef.current = new Audio(voiceData.audioUrl);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Fallback to synthetic if playback is blocked
        playSyntheticTone();
      });

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const cur = audioRef.current.currentTime;
          setCurrentTime(cur);
          setProgress((cur / (audioRef.current.duration || duration)) * 100);
        }
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
    } else {
      // Play synthetic LoRa radio chirp + voice tone simulation
      playSyntheticTone();
    }
  };

  const playSyntheticTone = () => {
    startTimeRef.current = Date.now();
    const durationMs = duration * 1000;

    stopSynthRef.current = playSyntheticRadioChirp('voice_sim', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    });

    const updateFrame = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const curSec = Math.min(elapsed / 1000, duration);
      setCurrentTime(curSec);
      setProgress(Math.min((curSec / duration) * 100, 100));

      if (elapsed < durationMs) {
        animationFrameRef.current = requestAnimationFrame(updateFrame);
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateFrame);
  };

  const handleSpeakTTS = () => {
    if (isSpeakingTTS) {
      stopSpeech();
      setIsSpeakingTTS(false);
      return;
    }

    setIsSpeakingTTS(true);
    const spokenText = voiceData.transcript || 'No transcript available.';
    speakText(spokenText, () => {
      setIsSpeakingTTS(false);
    });
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const triage = voiceData.aiTriage;

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-[14px] bg-card border border-border">
      {/* Player Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
            isPlaying
              ? 'bg-emergency text-white'
              : 'bg-active text-white hover:bg-neutral-800'
          }`}
          title={isPlaying ? 'Pause Audio' : 'Play Voice Note'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Audio Waveform Visualization */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          <div className="flex items-center gap-[2.5px] h-7 w-full overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => {
              // Static waveform curve heightened in middle
              const baseHeight = Math.sin((i / 28) * Math.PI) * 22 + 4;
              const isActive = (i / 28) * 100 <= progress;
              const isPulsing = isPlaying && Math.abs((i / 28) * 100 - progress) < 15;

              return (
                <div
                  key={i}
                  className={`w-full rounded-full transition-all duration-100 ${
                    isActive
                      ? 'bg-active'
                      : 'bg-border'
                  } ${isPulsing ? 'scale-y-125 bg-emergency' : ''}`}
                  style={{
                    height: `${Math.max(baseHeight, 4)}px`,
                  }}
                />
              );
            })}
          </div>

          {/* Time & Audio Label */}
          <div className="flex items-center justify-between text-[10px] font-mono text-txt-secondary">
            <span>{formatSec(currentTime)} / {formatSec(duration)}</span>
            <span className="flex items-center gap-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              LoRa Voice Packet (Codec2 700bps)
            </span>
          </div>
        </div>

        {/* Text-to-Speech (TTS) Voice Readout Button for Blind/Illiterate Assistance */}
        <button
          type="button"
          onClick={handleSpeakTTS}
          className={`px-2.5 py-1.5 rounded-btn border text-[11px] font-medium flex items-center gap-1.5 transition-all ${
            isSpeakingTTS
              ? 'border-emergency bg-emergency-light text-emergency font-semibold animate-pulse'
              : 'border-border bg-surface text-txt hover:bg-card'
          }`}
          title="Read transcript aloud using speech synthesis (Accessibility for visually impaired)"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isSpeakingTTS ? 'Speaking...' : 'Read Aloud'}</span>
        </button>
      </div>

      {/* Speech-to-Text (STT) Transcript Card */}
      {voiceData.transcript && (
        <div className="bg-surface/80 p-2.5 rounded-[10px] border border-border/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Automated Speech-To-Text (STT)
            </span>
            {voiceData.transcript.length > 80 && (
              <button
                type="button"
                onClick={() => setShowFullTranscript(!showFullTranscript)}
                className="text-[10px] font-medium text-txt-secondary hover:text-txt underline"
              >
                {showFullTranscript ? 'Show Less' : 'Show Full'}
              </button>
            )}
          </div>
          <p className="text-[12px] text-txt font-sans italic leading-relaxed">
            "{showFullTranscript || voiceData.transcript.length <= 80
              ? voiceData.transcript
              : `${voiceData.transcript.slice(0, 80)}...`}"
          </p>
        </div>
      )}

      {/* AI Emergency Triage & Extraction Panel */}
      {showTriage && triage && !compact && (
        <div className="mt-1 pt-2 border-t border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1">
              Rescue Triage Extraction
            </span>
            <span
              className={`badge text-[10px] uppercase font-bold ${
                triage.urgency === 'critical'
                  ? 'badge-emergency'
                  : triage.urgency === 'high'
                  ? 'badge-warning'
                  : 'badge-success'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {triage.urgency} Priority
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {triage.injuriesReported && (
              <div className="flex items-start gap-1.5 p-1.5 rounded bg-surface border border-border/60">
                <Stethoscope className="w-3.5 h-3.5 text-emergency shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-txt">Condition: </span>
                  <span className="text-txt-secondary">{triage.injuriesReported}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-1.5 p-1.5 rounded bg-surface border border-border/60">
              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-txt">Reported Count: </span>
                <span className="text-txt-secondary">{triage.victimCount} person(s)</span>
              </div>
            </div>

            {triage.hazards && triage.hazards.length > 0 && (
              <div className="sm:col-span-2 flex items-start gap-1.5 p-1.5 rounded bg-surface border border-border/60">
                <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-semibold text-txt">Hazards: </span>
                  {triage.hazards.map((h, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] text-txt-secondary">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {triage.recommendedAction && (
            <div className="text-[11px] p-2 rounded bg-amber-500/10 border border-amber-500/20 text-txt">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Action Plan: </span>
              {triage.recommendedAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
