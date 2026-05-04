import axios from 'axios';

const BASE_URL = '/api/images';

export const imageApi = {
  uploadImage: async (file, type = 'chat') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post(`${BASE_URL}/upload`, formData, { headers });
    return response.data;
  },

  getImageUrl: (userId, type, fileName) => {
    return `${BASE_URL}/${userId}/${type}/${fileName}`;
  }
};
