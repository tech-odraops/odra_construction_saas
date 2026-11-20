import axiosInstance from "../utils/axiosInstance";

export const getAssets = async (params, config = {}) => {
  const { data } = await axiosInstance.get("/assets", { params, ...config });
  return data;
};

export const uploadAsset = async ({ file, projectId, tags, assetType }) => {
  const formData = new FormData();
  formData.append(assetType === "image" ? "image" : "file", file);
  formData.append("projectId", projectId);
  formData.append("tags", JSON.stringify(tags));

  const endpoint = assetType === "image" ? "/assets" : "/assets/files";
  const { data } = await axiosInstance.post(endpoint, formData);
  return data.asset;
};

export const deleteAsset = async (assetId) => {
  const { data } = await axiosInstance.delete(`/assets/${assetId}`);
  return data;
};
