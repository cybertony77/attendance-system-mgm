import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../config';

// Query keys for students
export const studentKeys = {
  all: ['students'],
  lists: () => [...studentKeys.all, 'list'],
  list: (filters) => [...studentKeys.lists(), { filters }],
  details: () => [...studentKeys.all, 'detail'],
  detail: (id) => [...studentKeys.details(), id],
  history: () => [...studentKeys.all, 'history'],
};

// API functions
const studentsApi = {
  // Get all students
  getAll: async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get student by ID
  getById: async (id, token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get student history
  getHistory: async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/students/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create new student
  create: async (studentData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students`, studentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update student
  update: async (id, updateData, token) => {
    const response = await axios.put(`${getApiBaseUrl()}/api/students/${id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Delete student
  delete: async (id, token) => {
    const response = await axios.delete(`${getApiBaseUrl()}/api/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Toggle attendance (mark as attended or unattended)
  toggleAttendance: async (id, attendanceData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/attend`, attendanceData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Legacy function for backward compatibility
  markAttendance: async (id, attendanceData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/attend`, attendanceData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update homework status
  updateHomework: async (id, homeworkData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/hw`, homeworkData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },


  // Update quiz grade
  updateQuizGrade: async (id, quizData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/quiz_degree`, quizData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Send WhatsApp message
  sendWhatsApp: async (id, messageData, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/send-whatsapp`, messageData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update message state
  updateMessageState: async (id, message_state, week, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/students/${id}/message_state`, 
      { message_state, week }, 
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Check if student ID exists
  checkStudentIdExists: async (studentId, token) => {
    try {
      // Get all students and check if ID exists
      const response = await axios.get(`${getApiBaseUrl()}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const students = response.data;
      const exists = students.some(student => student.id.toString() === studentId.toString());
      
      return { exists };
    } catch (error) {
      throw error;
    }
  },
};

// React Query hooks
export const useStudents = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: () => studentsApi.getAll(sessionStorage.getItem('token')),
    enabled: !!sessionStorage.getItem('token'),
    ...options, // Spread the options to allow custom configuration
  });
};

export const useStudent = (id, options = {}) => {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => studentsApi.getById(id, sessionStorage.getItem('token')),
    enabled: !!id && !!sessionStorage.getItem('token'),
    ...options, // Spread the options to allow custom configuration
  });
};

export const useStudentsHistory = (options = {}) => {
  return useQuery({
    queryKey: studentKeys.history(),
    queryFn: () => studentsApi.getHistory(sessionStorage.getItem('token')),
    enabled: !!sessionStorage.getItem('token'),
    ...options, // Spread the options to allow custom configuration
  });
};

export const useCheckStudentId = (studentId) => {
  return useQuery({
    queryKey: [...studentKeys.all, 'check-id', studentId],
    queryFn: () => studentsApi.checkStudentIdExists(studentId, sessionStorage.getItem('token')),
    enabled: !!studentId && studentId.length > 0 && !!sessionStorage.getItem('token'),
    staleTime: 0, // Always fetch fresh data for ID checks
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus for ID checks
  });
};

// Mutations
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentData) =>
      studentsApi.create(studentData, sessionStorage.getItem('token')),
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updateData }) =>
      studentsApi.update(id, updateData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id, updateData }) => {
      console.log('📝 Student Updated - Invalidating caches:', {
        studentId: id,
        updatedFields: Object.keys(updateData),
        updateData
      });
      
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      studentsApi.delete(id, sessionStorage.getItem('token')),
    onSettled: async (_, __, id) => {
      console.log('🗑️ Student Deleted - Invalidating all caches:', {
        deletedStudentId: id
      });
      
      // Invalidate the specific student detail query so any active viewers get 404
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      
      // Also remove the query after invalidation to clean up cache
      setTimeout(() => {
        queryClient.removeQueries({ queryKey: studentKeys.detail(id) });
      }, 1000);
      
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useToggleAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attendanceData }) =>
      studentsApi.toggleAttendance(id, attendanceData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

// Legacy hook for backward compatibility
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attendanceData }) =>
      studentsApi.markAttendance(id, attendanceData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useUpdateHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, homeworkData }) =>
      studentsApi.updateHomework(id, homeworkData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};


export const useUpdateQuizGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quizData }) =>
      studentsApi.updateQuizGrade(id, quizData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useSendWhatsApp = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, messageData }) => studentsApi.sendWhatsApp(id, messageData, sessionStorage.getItem('token')),
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

export const useUpdateMessageState = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, message_state, week }) => {
      return studentsApi.updateMessageState(id, message_state, week, sessionStorage.getItem('token'));
    },
    onSettled: async (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.history() });
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'students' 
      });
    },
  });
};

