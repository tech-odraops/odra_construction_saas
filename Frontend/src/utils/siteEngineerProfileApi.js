import axiosInstance from "./axiosInstance";
import { store } from "../redux/store";
import { selectUserId } from "../redux/slices/authSlice";
import {
  cacheSiteEngineerProfile,
  getCachedSiteEngineerProfile,
} from "./siteEngineerProfileCache";

const pendingRequests = new Map();

export function getCachedOrFetchSiteEngineerProfile() {
  const cachedProfile = getCachedSiteEngineerProfile();
  if (cachedProfile) return Promise.resolve(cachedProfile);

  const userId = selectUserId(store.getState());
  if (userId && pendingRequests.has(userId)) {
    return pendingRequests.get(userId);
  }

  const request = axiosInstance.get("/profile/me")
    .then(({ data }) => {
      if (userId !== selectUserId(store.getState())) {
        throw new Error("Authenticated user changed while loading the profile");
      }
      cacheSiteEngineerProfile(data.profile);
      return data.profile;
    })
    .finally(() => {
      if (userId && pendingRequests.get(userId) === request) {
        pendingRequests.delete(userId);
      }
    });

  if (userId) pendingRequests.set(userId, request);
  return request;
}
