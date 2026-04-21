export const PATHS = {
  home: '/',
  notFound: '/404',
  gallery: '/gallery',
  testimonials: '/testimonials',
  events: '/events',
  contact: '/contact',
  feedback: '/feedback',
  gymMap: '/gym-map',
  blog: '/blog',
  tools: '/tools',
  blogPost: '/blog/:slug',
  auth: '/auth',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  progress: '/progress',
  nutrition: '/nutrition',
  attendance: '/attendance',
  workoutPlan: '/workout-plan',
  schedule: '/schedule',
  bookings: '/bookings',
  notifications: '/notifications',
  billing: '/billing',
  membership: '/membership',
  account: '/account',
  staff: '/staff',
  staffTools: '/staff/tools',
  staffProgress: '/staff/progress',
  staffNutrition: '/staff/nutrition',
  staffSchedule: '/staff/schedule',
  staffBookings: '/staff/bookings',
  staffNotifications: '/staff/notifications',
  staffWorkouts: '/staff/workouts',
  staffBilling: '/staff/billing',
  staffPos: '/staff/pos',
  staffAccess: '/staff/access',
  staffBlog: '/staff/blog',
  admin: '/admin',
  adminAccess: '/admin/access',
  adminAccessHardware: '/admin/access/hardware',
  adminPlans: '/admin/plans',
  adminFinance: '/admin/finance',
  adminReports: '/admin/reports',
  adminCrm: '/admin/crm',
  adminPos: '/admin/pos',
  adminBlog: '/admin/blog',
  memberDetail: '/admin/members/:memberId',
  exerciseDetail: '/exercise/:id',
};

export const getExerciseDetailPath = (id) => `/exercise/${id}`;
export const getBlogPostPath = (slug) => `/blog/${encodeURIComponent(slug)}`;
export const getAdminMemberDetailPath = (memberId) => `/admin/members/${memberId}`;
export const getStaffBookingPath = (sessionId = '') => (
  sessionId ? `/staff/bookings?sessionId=${encodeURIComponent(sessionId)}` : '/staff/bookings'
);

export const getStaffProgressPath = (memberId = '') => (
  memberId ? `/staff/progress?memberId=${encodeURIComponent(memberId)}` : '/staff/progress'
);

export const getStaffNutritionPath = (memberId = '') => (
  memberId ? `/staff/nutrition?memberId=${encodeURIComponent(memberId)}` : '/staff/nutrition'
);

export const getStaffBillingPath = (memberId = '') => (
  memberId ? `/staff/billing?memberId=${encodeURIComponent(memberId)}` : '/staff/billing'
);

export const getStaffNotificationPath = (userId = '') => (
  userId ? `/staff/notifications?userId=${encodeURIComponent(userId)}` : '/staff/notifications'
);

export const getStaffAccessPath = (accessPointId = '', deviceId = '') => {
  const searchParams = new URLSearchParams();

  if (accessPointId) {
    searchParams.set('accessPointId', accessPointId);
  }

  if (deviceId) {
    searchParams.set('deviceId', deviceId);
  }

  const queryString = searchParams.toString();

  if (!queryString) {
    return PATHS.staffAccess;
  }

  return `${PATHS.staffAccess}?${queryString}`;
};
