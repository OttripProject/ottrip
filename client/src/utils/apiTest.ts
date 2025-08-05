import { api } from '../services';

export const testApiConnection = async () => {
  try {
    console.log('Testing API connection...');
    const response = await api.get('/');
    console.log('API Response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('API Connection failed:', error);
    return { success: false, error };
  }
};

export const testPlansApi = async () => {
  try {
    console.log('Testing Plans API...');
    const response = await api.get('/private/plans');
    console.log('Plans API Response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Plans API failed:', error);
    return { success: false, error };
  }
}; 