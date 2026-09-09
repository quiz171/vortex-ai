export interface User {
  id?: string;
  email: string;
  fullName: string;
  educationLevel: 'Primary' | 'JSS' | 'SSS' | 'University' | 'Polytechnic' | string;
  classYear: string;
  course: string;
  school?: string;
  targetExam?: string;
  bio?: string;
  avatarColor?: string;
  studyStreak?: number;
  isGoogleAuth?: boolean;
  theme?: string;
  createdAt?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp?: string;
  ragSource?: boolean;
  attachedDoc?: string;
  image?: { data: string; mimeType: string } | null;
  imageUrl?: string;
}

export interface RagDocument {
  fileName: string;
  chunksCount: number;
  textPreview?: string;
  fullText?: string;
  uploadedAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  activeDoc?: RagDocument | null;
  updatedAt: string;
}
