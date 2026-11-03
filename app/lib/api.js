import axios from "axios";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://wa-kapil.piyushassudani.in").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach Bearer token to all outbound API requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);





export const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  const cleanApiUrl = API_URL.replace(/\/+$/, "");
  if (url.startsWith("/uploads")) {
    return `${cleanApiUrl}${url}`;
  }
  if (url.includes("localhost:") || url.includes("127.0.0.1:")) {
    return url.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, cleanApiUrl);
  }
  return url;
};

export const getContacts = () => api.get("/api/contacts");

export const getContact = (id) => api.get(`/api/contacts/${id}`);

export const getAccountHealth = () => api.get("/api/account-health");

export const getContactLists = () => api.get("/api/contact_lists");

export const getListContacts = (id) => api.get(`/api/contact_lists/${id}/contacts`);





export const getMessages = (contactId, limit = 100, offset = 0) =>
  api.get(`/api/messages/${contactId}`, { params: { limit, offset } });

export const markMessagesAsRead = (contactId) =>
  api.put(`/api/messages/${contactId}/read`);

export const sendMessage = (contactId, message) =>
  api.post(`/api/messages/${contactId}`, { message });

export const deleteMessage = (messageId) =>
  api.delete(`/api/messages/${messageId}`);

export const sendMedia = (contactId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/api/messages/${contactId}/media`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendTemplate = (contactId, templateName, languageCode = "en_US", components = []) =>
  api.post(`/api/messages/${contactId}/template`, {
    template_name: templateName,
    language_code: languageCode,
    components,
  });





export const getCampaigns = () => api.get("/api/campaigns");

export const getCampaign = (id) => api.get(`/api/campaigns/${id}`);

export const createCampaign = (formData) =>
  api.post("/api/campaigns", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });





export const getTemplates = () => api.get("/api/templates");





export const getMedia = () => api.get("/api/media");

export const uploadMedia = (formData) =>
  api.post("/api/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteMedia = (id) => api.delete(`/api/media/${id}`);

export const addContact = (contactData) => api.post("/api/contacts", contactData);
export const updateContact = (id, contactData) => api.put(`/api/contacts/${id}`, contactData);
export const deleteContact = (id) => api.delete(`/api/contacts/${id}`);
export const deleteCampaign = (id) => api.delete(`/api/campaigns/${id}`);
export const addContactToList = (listId, contactData) => api.post(`/api/contact_lists/${listId}/contacts`, contactData);
export const deleteContactList = (id) => api.delete(`/api/contact_lists/${id}`);

export default api;
