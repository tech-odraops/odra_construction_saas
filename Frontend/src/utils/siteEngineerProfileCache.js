import { store } from "../redux/store";
import { selectUserId } from "../redux/slices/authSlice";

const PROFILE_CACHE_PREFIX = "siteEngineerProfile:";
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;

function getProfileCacheKey() {
  const userId = selectUserId(store.getState());
  return userId ? `${PROFILE_CACHE_PREFIX}${userId}` : null;
}

export function getCachedSiteEngineerProfile() {
  const cacheKey = getProfileCacheKey();
  if (!cacheKey) return null;

  const cachedValue = sessionStorage.getItem(cacheKey);
  if (!cachedValue) return null;

  try {
    const cachedEntry = JSON.parse(cachedValue);
    if (
      cachedEntry?.profile &&
      typeof cachedEntry.profile === "object" &&
      !Array.isArray(cachedEntry.profile) &&
      typeof cachedEntry.cachedAt === "number" &&
      Date.now() - cachedEntry.cachedAt < PROFILE_CACHE_TTL_MS
    ) {
      return cachedEntry.profile;
    }
  } catch (error) {
    console.warn("Could not read cached Site Engineer profile; fetching it again.", error);
  }

  sessionStorage.removeItem(cacheKey);
  return null;
}

export function cacheSiteEngineerProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new Error("A valid Site Engineer profile is required for caching");
  }

  const cacheKey = getProfileCacheKey();
  if (!cacheKey) return;

  sessionStorage.setItem(cacheKey, JSON.stringify({
    profile,
    cachedAt: Date.now(),
  }));
}

export function clearSiteEngineerProfileCache() {
  const cacheKey = getProfileCacheKey();
  if (cacheKey) sessionStorage.removeItem(cacheKey);
}
