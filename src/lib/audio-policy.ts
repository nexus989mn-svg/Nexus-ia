export type AudioDecisionInput = {
  text: string;
  audioEnabled: boolean;
  voiceId?: string | null;
  explicitAudioRequest?: boolean;
  userMessage?: string;
};

export type AudioDecision = {
  useAudio: boolean;
  reason: "disabled" | "no_voice" | "explicit_request" | "long_explanation" | "natural_speech" | "prefer_text";
};

/**
 * Deterministic guardrail used by the future n8n worker.
 * The model may suggest audio, but these hard gates decide whether it is allowed.
 */
export function decideAudioDelivery(input: AudioDecisionInput): AudioDecision {
  if (!input.audioEnabled) return { useAudio: false, reason: "disabled" };
  if (!input.voiceId) return { useAudio: false, reason: "no_voice" };

  const text = input.text.trim();
  const user = (input.userMessage ?? "").toLowerCase();
  if (input.explicitAudioRequest || /\b(manda|envia|fale|fala|áudio|audio|voz)\b/.test(user)) {
    return { useAudio: true, reason: "explicit_request" };
  }

  // Text is better for highly structured content and identifiers.
  if (/https?:\/\/|www\.|\b\d{3,}[-./]\d{2,}|```|\|/.test(text)) {
    return { useAudio: false, reason: "prefer_text" };
  }

  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
  if (text.length >= 900 && sentences >= 3) {
    return { useAudio: true, reason: "long_explanation" };
  }

  // Short natural conversational replies remain text-first.
  if (text.length <= 420 && sentences <= 2) {
    return { useAudio: false, reason: "prefer_text" };
  }

  if (/\b(explicar|explicando|passo a passo|detalhadamente|como funciona|te explico)\b/i.test(text)) {
    return { useAudio: true, reason: "natural_speech" };
  }

  return { useAudio: false, reason: "prefer_text" };
}
