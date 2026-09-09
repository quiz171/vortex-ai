import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Check for user-provided Supabase credentials (exclude dead/mock placeholders)
const rawUrl = process.env.SUPABASE_URL?.trim();
const rawKey = process.env.SUPABASE_KEY?.trim();

const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes("xntjupiplalvlmmqybth") ||
  rawUrl.includes("example.com") ||
  rawUrl.includes("placeholder");

const isPlaceholderKey =
  !rawKey ||
  rawKey.includes("placeholder") ||
  rawKey.length < 20;

let supabase: SupabaseClient | null = null;
let isSupabaseHealthy = false;

if (rawUrl && rawKey && !isPlaceholderUrl && !isPlaceholderKey) {
  try {
    supabase = createClient(rawUrl, rawKey, {
      auth: { persistSession: false },
    });
    isSupabaseHealthy = true;
  } catch (err) {
    console.warn("Supabase initialization error, falling back to local persistent store:", err);
    supabase = null;
    isSupabaseHealthy = false;
  }
}

// Local Persistent & In-Memory Store
export const inMemoryUsers = new Map<string, any>(); // keyed by email and id
export const inMemoryChats = new Map<string, any[]>(); // keyed by userId -> array of messages
export const inMemoryMaterials = new Map<string, any[]>(); // keyed by userId -> array of materials

// File-based persistence across server restarts
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.users && Array.isArray(parsed.users)) {
        for (const u of parsed.users) {
          inMemoryUsers.set(u.email.toLowerCase(), u);
          inMemoryUsers.set(u.id, u);
        }
      }
      if (parsed.chats && typeof parsed.chats === "object") {
        for (const [uid, msgs] of Object.entries(parsed.chats)) {
          inMemoryChats.set(uid, msgs as any[]);
        }
      }
      if (parsed.materials && typeof parsed.materials === "object") {
        for (const [uid, mats] of Object.entries(parsed.materials)) {
          inMemoryMaterials.set(uid, mats as any[]);
        }
      }
    }
  } catch {
    // Silently continue if disk read fails
  }
}

function persistToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const uniqueUsers: any[] = [];
    const seenEmails = new Set<string>();
    for (const [key, user] of inMemoryUsers.entries()) {
      if (key.includes("@") && !seenEmails.has(key)) {
        seenEmails.add(key);
        uniqueUsers.push(user);
      }
    }

    const chatsObj: Record<string, any[]> = {};
    for (const [uid, msgs] of inMemoryChats.entries()) {
      chatsObj[uid] = msgs;
    }

    const materialsObj: Record<string, any[]> = {};
    for (const [uid, mats] of inMemoryMaterials.entries()) {
      materialsObj[uid] = mats;
    }

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ users: uniqueUsers, chats: chatsObj, materials: materialsObj }, null, 2),
      "utf-8"
    );
  } catch {
    // Disk write error ignored
  }
}

// Initialize on module load
loadFromDisk();

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  educationLevel: string;
  classYear: string;
  course: string;
  createdAt?: string;
}

export interface ChatRecord {
  id?: string;
  userId: string;
  role: "user" | "assistant" | "model";
  content: string;
  timestamp: string;
}

export interface MaterialRecord {
  id?: string;
  userId: string;
  fileName: string;
  chunksCount: number;
  createdAt: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Supabase request timeout")), ms)),
  ]);
}

export async function saveUser(user: UserRecord): Promise<UserRecord> {
  // Always update in-memory and disk first
  inMemoryUsers.set(user.email.toLowerCase(), user);
  inMemoryUsers.set(user.id, user);
  persistToDisk();

  if (supabase && isSupabaseHealthy) {
    try {
      const query = supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            full_name: user.fullName,
            email: user.email.toLowerCase(),
            password_hash: user.passwordHash,
            education_level: user.educationLevel,
            class_year: user.classYear,
            course: user.course,
            created_at: user.createdAt || new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      const { data, error } = await withTimeout(Promise.resolve(query), 2000);

      if (!error && data) {
        return {
          id: data.id || user.id,
          fullName: data.full_name || user.fullName,
          email: data.email || user.email,
          passwordHash: data.password_hash || user.passwordHash,
          educationLevel: data.education_level || user.educationLevel,
          classYear: data.class_year || user.classYear,
          course: data.course || user.course,
          createdAt: data.created_at || user.createdAt,
        };
      }
    } catch {
      // Circuit breaker: disable Supabase if it fails/times out
      isSupabaseHealthy = false;
    }
  }

  return user;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // Fast path: check memory/disk store first (sub-millisecond)
  const cached = inMemoryUsers.get(normalizedEmail);
  if (cached) {
    return cached;
  }

  // Only check Supabase if enabled, healthy, and not found locally
  if (supabase && isSupabaseHealthy) {
    try {
      const query = supabase
        .from("users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      const { data, error } = await withTimeout(Promise.resolve(query), 2000);

      if (!error && data) {
        const record: UserRecord = {
          id: data.id,
          fullName: data.full_name,
          email: data.email,
          passwordHash: data.password_hash,
          educationLevel: data.education_level,
          classYear: data.class_year,
          course: data.course,
          createdAt: data.created_at,
        };
        inMemoryUsers.set(normalizedEmail, record);
        inMemoryUsers.set(data.id, record);
        persistToDisk();
        return record;
      }
    } catch {
      // Trip circuit breaker to avoid further timeouts
      isSupabaseHealthy = false;
    }
  }

  return inMemoryUsers.get(normalizedEmail) || null;
}

export async function saveChat(
  userId: string,
  role: "user" | "assistant" | "model",
  content: string,
  timestamp: Date = new Date()
): Promise<ChatRecord> {
  const record: ChatRecord = {
    userId,
    role,
    content,
    timestamp: timestamp.toISOString(),
  };

  const userChatList = inMemoryChats.get(userId) || [];
  userChatList.push(record);
  inMemoryChats.set(userId, userChatList);
  persistToDisk();

  if (supabase && isSupabaseHealthy) {
    Promise.resolve(
      supabase.from("chats").insert({
        user_id: userId,
        role: role,
        content: content,
        created_at: record.timestamp,
      })
    ).catch(() => {
      isSupabaseHealthy = false;
    });
  }

  return record;
}

export async function getHistory(userId: string, limit: number = 10): Promise<{ role: string; content: string }[]> {
  const list = inMemoryChats.get(userId) || [];
  if (list.length > 0) {
    const sliced = list.slice(-limit);
    return sliced.map((item) => ({
      role: item.role === "assistant" || item.role === "model" ? "assistant" : "user",
      content: item.content,
    }));
  }

  if (supabase && isSupabaseHealthy) {
    try {
      const query = supabase
        .from("chats")
        .select("role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(limit);

      const { data, error } = await withTimeout(Promise.resolve(query), 2000);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          role: d.role === "assistant" || d.role === "model" ? "assistant" : "user",
          content: d.content,
        }));
      }
    } catch {
      isSupabaseHealthy = false;
    }
  }

  return [];
}

export async function saveMaterial(userId: string, fileName: string, chunksCount: number): Promise<MaterialRecord> {
  const record: MaterialRecord = {
    userId,
    fileName,
    chunksCount,
    createdAt: new Date().toISOString(),
  };

  const list = inMemoryMaterials.get(userId) || [];
  list.push(record);
  inMemoryMaterials.set(userId, list);
  persistToDisk();

  if (supabase && isSupabaseHealthy) {
    Promise.resolve(
      supabase.from("materials").insert({
        user_id: userId,
        file_name: fileName,
        chunks_count: chunksCount,
        created_at: record.createdAt,
      })
    ).catch(() => {
      isSupabaseHealthy = false;
    });
  }

  return record;
}
