import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SEED_CAPTIONS, SeedCaption } from '../config/captions';
import { CAPTION_RULES } from '../config/captionRules';
import { Task, UserSettings } from '../types';
import { LanguageCode } from '../config/languages';
import { saveUserSettings } from './userService';

// In-memory cache for Firestore captions to optimize reads
let cachedCaptions: SeedCaption[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Loads all active captions from Firestore "captions" top-level collection.
 * Falls back to local SEED_CAPTIONS if Firestore is empty, offline, or errors.
 */
export async function getActiveCaptions(): Promise<SeedCaption[]> {
  const now = Date.now();
  if (cachedCaptions && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedCaptions;
  }

  try {
    const colRef = collection(db, 'captions');
    const q = query(colRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: SeedCaption[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          language: data.language,
          level: data.level,
          context: data.context || 'task',
          text: data.text,
          active: data.active !== false,
        };
      });
      cachedCaptions = items;
      lastFetchTime = now;
      return items;
    }
  } catch (err) {
    console.warn('[Captions] Firestore fetch failed or offline, using local fallback:', err);
  }

  // Fallback to local seeds
  cachedCaptions = SEED_CAPTIONS.filter(c => c.active);
  lastFetchTime = now;
  return cachedCaptions;
}

/**
 * Calculates current escalation level (1, 2, or 3) for a task based on snoozes and overdue minutes.
 */
export function calculateEscalationLevel(task: Task, nowMs: number = Date.now()): 1 | 2 | 3 {
  const snoozeCount = task.snoozeCount || 0;

  // Calculate overdue minutes
  let overdueMinutes = 0;
  if (task.dueAt) {
    const dueMs = new Date(
      typeof task.dueAt === 'string'
        ? task.dueAt
        : (task.dueAt as any).toDate?.() || nowMs
    ).getTime();
    if (dueMs < nowMs) {
      overdueMinutes = Math.floor((nowMs - dueMs) / (60 * 1000));
    }
  }

  // Level 3: 3+ snoozes or > 120 minutes overdue
  if (
    snoozeCount >= CAPTION_RULES.level3SnoozeThreshold ||
    overdueMinutes >= CAPTION_RULES.level3OverdueMinutes
  ) {
    return 3;
  }

  // Level 2: 1-2 snoozes or > 30 minutes overdue
  if (
    snoozeCount >= CAPTION_RULES.level2SnoozeThreshold ||
    overdueMinutes >= CAPTION_RULES.level2OverdueMinutes
  ) {
    return 2;
  }

  // Level 1: Initial reminder
  return 1;
}

export interface GetCaptionParams {
  task: Task;
  userName?: string;
  language?: LanguageCode;
  userSettings?: UserSettings | null;
  onCaptionSelected?: (captionId: string) => void;
}

export interface SmartCaptionResult {
  text: string;
  level: 1 | 2 | 3;
  captionId: string;
}

/**
 * Core escalation & smart caption selector.
 * Returns null if user has turned captions off in settings.
 */
export async function getSmartCaption({
  task,
  userName = 'there',
  language = 'en',
  userSettings,
  onCaptionSelected,
}: GetCaptionParams): Promise<SmartCaptionResult | null> {
  // Check user setting toggle
  if (userSettings && userSettings.captionsEnabled === false) {
    return null;
  }

  let level = calculateEscalationLevel(task);

  // Apply user setting cap on intensity
  const intensity = userSettings?.captionIntensity || 'friendly';
  if (intensity === 'gentle') {
    level = 1;
  } else if (intensity === 'friendly') {
    level = Math.min(level, 2) as 1 | 2;
  } // 'roast' allows level 1, 2, or 3

  const allCaptions = await getActiveCaptions();

  // Filter matching language and level
  const candidates = allCaptions.filter(
    c => c.language === language && c.level === level && c.active
  );

  if (candidates.length === 0) {
    // Fallback to English if language specific has no candidates
    const enFallback = allCaptions.filter(
      c => c.language === 'en' && c.level === level && c.active
    );
    if (enFallback.length === 0) return null;
    return selectAndInterpolate(enFallback, task, userName, userSettings, onCaptionSelected);
  }

  return selectAndInterpolate(candidates, task, userName, userSettings, onCaptionSelected);
}

function selectAndInterpolate(
  candidates: SeedCaption[],
  task: Task,
  userName: string,
  userSettings?: UserSettings | null,
  onCaptionSelected?: (captionId: string) => void
): SmartCaptionResult {
  const recentIds = userSettings?.recentCaptionIds || [];

  // Exclude last 5 shown IDs if there are other candidates
  const freshCandidates = candidates.filter(c => !recentIds.includes(c.id));
  const pool = freshCandidates.length > 0 ? freshCandidates : candidates;

  const chosen = pool[Math.floor(Math.random() * pool.length)];

  // Calculate overdue minutes
  let overdueMinutes = 0;
  if (task.dueAt) {
    const dueMs = new Date(
      typeof task.dueAt === 'string'
        ? task.dueAt
        : (task.dueAt as any).toDate?.() || Date.now()
    ).getTime();
    if (dueMs < Date.now()) {
      overdueMinutes = Math.floor((Date.now() - dueMs) / (60 * 1000));
    }
  }

  // Replace template variables
  const text = chosen.text
    .replace(/{name}/g, userName || 'there')
    .replace(/{task}/g, task.title)
    .replace(/{minutes}/g, String(Math.max(overdueMinutes, 15)))
    .replace(/{snoozeCount}/g, String(task.snoozeCount || 1));

  if (onCaptionSelected) {
    onCaptionSelected(chosen.id);
  } else if (userSettings?.userId) {
    // Record to recentCaptionIds asynchronously
    const nextRecents = [chosen.id, ...recentIds.filter(id => id !== chosen.id)].slice(
      0,
      CAPTION_RULES.maxRecentIdsMemory
    );
    saveUserSettings(userSettings.userId, { recentCaptionIds: nextRecents }).catch(() => {});
  }

  return {
    text,
    level: chosen.level,
    captionId: chosen.id,
  };
}

/**
 * Developer helper function: One-time seeding of all 75 seed captions into Firestore top-level "captions" collection.
 */
export async function seedCaptionsToFirestore(): Promise<{ count: number }> {
  const colRef = collection(db, 'captions');
  const existingSnap = await getDocs(colRef);

  if (!existingSnap.empty) {
    console.log(`[Captions] Collection already has ${existingSnap.size} documents.`);
    return { count: existingSnap.size };
  }

  // Batch insert all seed captions
  const batch = writeBatch(db);
  for (const item of SEED_CAPTIONS) {
    const docRef = doc(db, 'captions', item.id);
    batch.set(docRef, {
      id: item.id,
      language: item.language,
      level: item.level,
      context: item.context,
      text: item.text,
      active: item.active,
      createdAt: new Date().toISOString(),
    });
  }

  await batch.commit();
  cachedCaptions = null; // Invalidate cache
  console.log(`[Captions] Successfully seeded ${SEED_CAPTIONS.length} captions into Firestore.`);
  return { count: SEED_CAPTIONS.length };
}
