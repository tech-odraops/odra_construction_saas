import axiosInstance from "./axiosInstance";
import {
  cacheSiteEngineerProfile,
  getCachedSiteEngineerProfile,
} from "./siteEngineerProfileCache";

const pendingRequests = new Map();

export function getCachedOrFetchSiteEngineerProfile() {
  const cachedProfile = getCachedSiteEngineerProfile();
  if (cachedProfile) return Promise.resolve(cachedProfile);

  const userId = localStorage.getItem("User_id");
  if (userId && pendingRequests.has(userId)) {
    return pendingRequests.get(userId);
  }

  const request = axiosInstance.get("/profile/me")
    .then(({ data }) => {
      if (userId !== localStorage.getItem("User_id")) {
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
