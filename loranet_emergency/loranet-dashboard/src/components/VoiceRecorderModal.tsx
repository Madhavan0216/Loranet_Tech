import { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, Send, X,
  Volume2, ShieldCheck, Play, Pause, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VOICE_PRESETS, analyzeVoiceTranscript, speakText } from '../utils/audioUtils';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
}

export default function VoiceRecorderModal({
  isOpen,
  onClose,
  defaultRecipient = 'BROADCAST',
}: VoiceRecorderModalProps) {
  const { nodes, sendVoiceMessage, addToast } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>(defaultRecipient);
  const [priority, setPriority] = useState<'normal' | 'high' | 'emergency'>('emergency');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setIsRecording(false);
    setRecordSeconds(0);
    setAudioBlobUrl(null);
    setRecordedDuration(0);
    setTranscript('');
    setSelectedPresetId(null);
    setIsPreviewPlaying(false);
  };

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // Real microphone recording via browser MediaRecorder API
  const startRecording = async () => {
    handleReset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);

      // Automated transcription simulation for accessibility demo if SpeechRecognition not active
      setTranscript('Live voice stream recorded via microphone. Encoding into LoRa Codec2 audio packet...');

      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or unsupported:', err);
      // Fallback: Enable simulated voice recorder so testing works seamlessly
      setIsRecording(true);
      setRecordSeconds(0);
      setTranscript('Emergency Voice Note: "Victim requires immediate extraction assistance. Radio GPS beacon active."');

      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 6) {
            stopRecording();
            return 7;
          }
          return prev + 1;
        });
      }, 1000);
      addToast('Simulated voice mode active (Microphone access not granted)', 'info');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    const duration = Math.max(recordSeconds, 3.5);
    setRecordedDuration(duration);

    if (!transcript || transcript.includes('Live voice stream')) {
      setTranscript('Voice SOS: Need emergency rescue at my current GPS coordinates. Please dispatch rescue team.');
    }

    addToast(`Voice note captured (${duration}s)`, 'success');
  };

  const handleSelectPreset = (preset: typeof VOICE_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setTranscript(preset.transcript);
    setRecordedDuration(preset.duration);
    setPriority(preset.urgency === 'critical' ? 'emergency' : preset.urgency === 'high' ? 'high' : 'normal');
    setAudioBlobUrl(null); // Will use synthetic voice tone
    speakText(preset.transcript);
  };

  const handleTogglePreview = () => {
    if (audioBlobUrl) {
      if (isPreviewPlaying) {
        if (previewAudioRef.current) previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        if (!previewAudioRef.current) {
          previewAudioRef.current = new Audio(audioBlobUrl);
        }
        previewAudioRef.current.play();
        setIsPreviewPlaying(true);
        previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      }
    } else if (transcript) {
      speakText(transcript);
    }
  };

  const handleTransmit = () => {
    const finalTranscript = transcript || 'Emergency voice distress beacon transmitted across LoRa mesh.';
    const finalDuration = recordedDuration || 5.0;
    const triage = analyzeVoiceTranscript(finalTranscript);

    sendVoiceMessage(
      recipient,
      finalTranscript,
      finalDuration,
      audioBlobUrl || undefined,
      priority,
      triage
    );

    speakText('Voice emergency note broadcast across LoRa mesh. Rescue team is notified.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card w-full max-w-xl rounded-card border border-border shadow-modal overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emergency-light flex items-center justify-center text-emergency">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-txt">Emergency Voice Note Dispatch</h2>
              <p className="text-[11px] text-txt-secondary">
                Designed for blind, illiterate, or immobilized victims & rescue personnel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-txt-secondary hover:text-txt hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Main Voice Recording Action Bar */}
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-surface rounded-card border border-border/80 text-center relative overflow-hidden">
            {/* Recording pulse effect */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full bg-emergency/15 animate-ping" />
                <div className="w-28 h-28 rounded-full bg-emergency/25 animate-pulse" />
              </div>
            )}

            {/* Giant Accessible Mic Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-white transition-all transform active:scale-95 shadow-lg ${
                isRecording
                  ? 'bg-emergency hover:bg-red-600 animate-pulse'
                  : 'bg-active hover:bg-neutral-800'
              }`}
              title={isRecording ? 'Click to Stop Recording' : 'Click to Speak Voice Note'}
            >
              {isRecording ? (
                <>
                  <Square className="w-7 h-7 fill-white" />
                  <span className="text-[10px] font-bold mt-1 uppercase">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-7 h-7" />
                  <span className="text-[10px] font-bold mt-1 uppercase">SPEAK</span>
                </>
              )}
            </button>

            {/* Live Recording Timer */}
            <div className="mt-4 font-mono text-[16px] font-bold text-txt">
              {isRecording ? (
                <span className="text-emergency flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emergency animate-ping" />
                  RECORDING 00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 00:30
                </span>
              ) : recordedDuration > 0 ? (
                <span className="text-success flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Recorded {recordedDuration.toFixed(1)}s audio ready
                </span>
              ) : (
                <span className="text-txt-secondary text-[13px] font-sans font-medium">
                  Tap microphone to start recording (Max 30s for LoRa bandwidth)
                </span>
              )}
            </div>

            {/* Playback preview if recorded */}
            {recordedDuration > 0 && !isRecording && (
              <button
                type="button"
                onClick={handleTogglePreview}
                className="mt-3 px-3 py-1.5 rounded-btn border border-border bg-card text-[12px] font-semibold text-txt flex items-center gap-2 hover:bg-surface shadow-sm"
              >
                {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPreviewPlaying ? 'Pause Preview' : 'Listen to Recording Preview'}
              </button>
            )}
          </div>

          {/* Illiterate / Blind Emergency Voice Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Assistive One-Tap Presets (Blind / Illiterate Assistance)
              </span>
              <span className="text-[11px] text-txt-secondary">Tap to preview & select</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 text-left rounded-btn border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-active bg-active text-white shadow-sm'
                        : 'border-border bg-card text-txt hover:bg-surface'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold">{preset.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : preset.urgency === 'critical'
                              ? 'bg-emergency-light text-emergency font-bold'
                              : 'bg-surface text-txt-secondary'
                          }`}
                        >
                          {preset.urgency}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-white/80' : 'text-txt-secondary'}`}>
                        "{preset.transcript}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30 text-[10px]">
                      <span>⏱ {preset.duration}s</span>
                      <span>·</span>
                      <span>🔊 Tap reads aloud</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transcript & AI Triage Preview */}
          {transcript && (
            <div className="p-3.5 rounded-btn bg-surface border border-border flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Auto-Transcription Preview
                </span>
                <span className="text-[10px] font-mono text-txt-secondary">
                  Ready for LoRa transmission
                </span>
              </div>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={2}
                className="w-full text-[12px] text-txt bg-card p-2 rounded border border-border resize-none font-sans outline-none focus:border-active"
                placeholder="Spoken transcription will appear here..."
              />
            </div>
          )}

          {/* Transmission Options: Recipient & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1">
                Recipient Mesh Node
              </label>
              <select
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[12px] font-medium text-txt outline-none"
              >
                <option value="BROADCAST">Broadcast to All Rescue Nodes</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.id} — {n.name} ({n.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1">
                Urgency Priority
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'high', 'emergency'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 rounded-btn border text-[11px] font-semibold capitalize transition-all ${
                      priority === p
                        ? p === 'emergency'
                          ? 'bg-emergency border-emergency text-white'
                          : p === 'high'
                          ? 'bg-warning border-warning text-white'
                          : 'bg-active border-active text-white'
                        : 'bg-card border-border text-txt hover:bg-surface'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface/50">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleTransmit}
            disabled={!transcript && !audioBlobUrl}
            className="btn btn-emergency btn-sm shadow-md flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit Voice SOS Over LoRa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
