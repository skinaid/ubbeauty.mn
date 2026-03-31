export type SectionType =
  | "brand_core"
  | "audience"
  | "positioning"
  | "voice_tone"
  | "messaging_system"
  | "product_knowledge"
  | "customer_journey"
  | "content_examples"
  | "guardrails"
  | "feedback_loop";

export const SECTION_ORDER: SectionType[] = [
  "brand_core",
  "audience",
  "positioning",
  "voice_tone",
  "messaging_system",
  "product_knowledge",
  "customer_journey",
  "content_examples",
  "guardrails",
  "feedback_loop",
];

export const SECTION_META: Record<SectionType, { label: string; description: string; emoji: string }> = {
  brand_core:        { emoji: "🧬", label: "Brand Core (DNA)",      description: "Брэндийн зорилго, үнэт зүйл, алсын харааг тодорхойлно" },
  audience:          { emoji: "🎯", label: "Audience (ICP + Persona)", description: "Хэн рүү хандаж байгааг тодорхойлно" },
  positioning:       { emoji: "📍", label: "Positioning",           description: "Зах зээлд хэрхэн байрлаж байгааг тодорхойлно" },
  voice_tone:        { emoji: "🗣️", label: "Voice & Tone",          description: "Брэндийн ярих хэлбэр, хэв маягийг тодорхойлно" },
  messaging_system:  { emoji: "💬", label: "Messaging System",      description: "Гол мессеж, tagline, key messages" },
  product_knowledge: { emoji: "📦", label: "Product Knowledge",     description: "Бүтээгдэхүүн, үйлчилгээний дэлгэрэнгүй мэдлэг" },
  customer_journey:  { emoji: "🗺️", label: "Customer Journey",      description: "Хэрэглэгчийн аялалын зам, touchpoint-ууд" },
  content_examples:  { emoji: "📝", label: "Content Examples",      description: "Жишээ контент, хүлээн зөвшөөрсөн хэлбэрүүд" },
  guardrails:        { emoji: "🚧", label: "Guardrails",            description: "Юу хийхгүй, хориглох зүйлс" },
  feedback_loop:     { emoji: "🔄", label: "Feedback Loop",         description: "Сурч дасах, шинэчлэгдэх тогтолцоо" },
};

export type BrandManagerStatus = "draft" | "training" | "active" | "archived";

export type BrandManager = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  avatar_color: string;
  status: BrandManagerStatus;
  overall_score: number;
  created_at: string;
  updated_at: string;
};

export type BrandKnowledgeSection = {
  id: string;
  brand_manager_id: string;
  section_type: SectionType;
  content: Record<string, unknown>;
  completeness_score: number;
  is_complete: boolean;
  last_trained_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainingMessage = {
  role: "assistant" | "user";
  content: string;
  timestamp: string;
};

export type BrandTrainingSession = {
  id: string;
  brand_manager_id: string;
  organization_id: string;
  current_section: SectionType;
  messages: TrainingMessage[];
  status: "active" | "completed" | "paused";
  created_at: string;
  updated_at: string;
};
