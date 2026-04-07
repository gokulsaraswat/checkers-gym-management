export const PATHS = {
  home: '/',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  account: '/account',
  staff: '/staff',
  admin: '/admin',
  exerciseDetail: '/exercise/:id',
};

export const getExerciseDetailPath = (id) => `/exercise/${id}`;
