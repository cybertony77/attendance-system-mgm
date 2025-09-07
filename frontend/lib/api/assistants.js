import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../config';

// Query keys for assistants
export const assistantKeys = {
  all: ['assistants'],
  lists: () => [...assistantKeys.all, 'list'],
  list: (filters) => [...assistantKeys.lists(), { filters }],
  details: () => [...assistantKeys.all, 'detail'],
  detail: (id) => [...assistantKeys.details(), id],
};

// API functions
const assistantsApi = {
  // Get all assistants
  getAll: async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/auth/assistants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get assistant by ID
  getById: async (id, token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/auth/assistants/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Check if username exists
  checkUsernameExists: async (username, token) => {
    try {
      // Get all assistants and check if username exists
      const response = await axios.get(`${getApiBaseUrl()}/api/auth/assistants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const assistants = response.data;
      const exists = assistants.some(assistant => assistant.id === username);
      
      return { exists };
    } catch (error) {
      throw error;
    }
  },

  // Create new assistant
  create: async (assistantData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/auth/assistants`, assistantData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update assistant
  update: async (id, updateData, token) => {
    const response = await axios.put(`${getApiBaseUrl()}/api/auth/assistants/${id}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Delete assistant
  delete: async (id, token) => {
    const response = await axios.delete(`${getApiBaseUrl()}/api/auth/assistants/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};

// React Query hooks
export const useAssistants = (filters = {}) => {
  return useQuery({
    queryKey: assistantKeys.list(filters),
    queryFn: () => assistantsApi.getAll(sessionStorage.getItem('token')),
    enabled: !!sessionStorage.getItem('token'),
  });
};

export const useAssistant = (id) => {
  return useQuery({
    queryKey: assistantKeys.detail(id),
    queryFn: () => assistantsApi.getById(id, sessionStorage.getItem('token')),
    enabled: !!id && !!sessionStorage.getItem('token'),
  });
};

export const useCheckUsername = (username) => {
  return useQuery({
    queryKey: [...assistantKeys.all, 'check-username', username],
    queryFn: () => assistantsApi.checkUsernameExists(username, sessionStorage.getItem('token')),
    enabled: !!username && username.length > 0 && !!sessionStorage.getItem('token'),
    staleTime: 0, // Always fetch fresh data for username checks
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus for username checks
  });
};

// Mutations
export const useCreateAssistant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assistantData) => assistantsApi.create(assistantData, sessionStorage.getItem('token')),
    onSuccess: (newAssistant) => {
      // Optimistically update the assistants list
      queryClient.setQueryData(assistantKeys.lists(), (oldData) => {
        if (oldData) {
          return [...oldData, newAssistant];
        }
        return [newAssistant];
      });
      
      // Invalidate and refetch assistants list
      queryClient.invalidateQueries({ queryKey: assistantKeys.lists() });
    },
  });
};

export const useUpdateAssistant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updateData }) => assistantsApi.update(id, updateData, sessionStorage.getItem('token')),
    onMutate: async ({ id, updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: assistantKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: assistantKeys.lists() });

      // Snapshot the previous value
      const previousAssistant = queryClient.getQueryData(assistantKeys.detail(id));
      const previousAssistants = queryClient.getQueryData(assistantKeys.lists());

      // Optimistically update to the new value
      if (previousAssistant) {
        queryClient.setQueryData(assistantKeys.detail(id), { ...previousAssistant, ...updateData });
      }
      
      if (previousAssistants) {
        queryClient.setQueryData(assistantKeys.lists(), (oldData) => 
          oldData?.map(assistant => assistant.id === id ? { ...assistant, ...updateData } : assistant)
        );
      }

      // Return a context object with the snapshotted value
      return { previousAssistant, previousAssistants };
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAssistant) {
        queryClient.setQueryData(assistantKeys.detail(id), context.previousAssistant);
      }
      if (context?.previousAssistants) {
        queryClient.setQueryData(assistantKeys.lists(), context.previousAssistants);
      }
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: assistantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assistantKeys.lists() });
    },
  });
};

export const useDeleteAssistant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => assistantsApi.delete(id, sessionStorage.getItem('token')),
    onSuccess: (data, id) => {
      // Optimistically remove from assistants list
      queryClient.setQueryData(assistantKeys.lists(), (oldData) => 
        oldData?.filter(assistant => assistant.id !== id)
      );
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: assistantKeys.detail(id) });
      
      // Invalidate and refetch assistants list
      queryClient.invalidateQueries({ queryKey: assistantKeys.lists() });
    },
  });
};
