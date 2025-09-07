import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../config';

// Query keys for authentication
export const authKeys = {
  all: ['auth'],
  profile: () => [...authKeys.all, 'profile'],
};

// API functions
const authApi = {
  // Login
  login: async (credentials) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/auth/login`, credentials);
    return response.data;
  },

  // Get current user profile
  getProfile: async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update current user profile
  updateProfile: async (updateData, token) => {
    const response = await axios.put(`${getApiBaseUrl()}/api/auth/me`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};

// React Query hooks
export const useProfile = () => {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authApi.getProfile(sessionStorage.getItem('token')),
    enabled: !!sessionStorage.getItem('token'),
  });
};

// Mutations
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (data) => {
      // Store token
      sessionStorage.setItem('token', data.token);
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updateData) => authApi.updateProfile(updateData, sessionStorage.getItem('token')),
    onMutate: async (updateData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.profile() });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(authKeys.profile());

      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData(authKeys.profile(), { ...previousProfile, ...updateData });
      }

      // Return a context object with the snapshotted value
      return { previousProfile };
    },
    onError: (err, updateData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProfile) {
        queryClient.setQueryData(authKeys.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
};

