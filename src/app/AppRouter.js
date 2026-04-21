import React, { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppErrorBoundary from '../features/errors/AppErrorBoundary';
import HomePage from '../features/exercises/pages/HomePage';
import AdminRoute from '../routes/AdminRoute';
import GuestRoute from '../routes/GuestRoute';
import ProtectedRoute from '../routes/ProtectedRoute';
import StaffRoute from '../routes/StaffRoute';
import AppShell from './AppShell';
import { PATHS } from './paths';

const ExerciseDetailPage = lazy(() => import('../features/exercises/pages/ExerciseDetailPage'));
const AuthPage = lazy(() => import('../features/auth/AuthPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const ProgressTrackingPage = lazy(() => import('../features/progress/ProgressTrackingPage'));
const NutritionPage = lazy(() => import('../features/nutrition/NutritionPage'));
const AttendancePage = lazy(() => import('../features/attendance/AttendancePage'));
const MemberWorkoutPlanPage = lazy(() => import('../features/workouts/MemberWorkoutPlanPage'));
const ClassSchedulePage = lazy(() => import('../features/classes/ClassSchedulePage'));
const BookingsPage = lazy(() => import('../features/bookings/BookingsPage'));
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage'));
const BillingPage = lazy(() => import('../features/billing/BillingPage'));
const MembershipProfilePage = lazy(() => import('../features/members/MemberProfilePage'));
const MemberDetailPage = lazy(() => import('../features/members/MemberDetailPage'));
const AccountPage = lazy(() => import('../features/account/AccountPage'));
const StaffHomePage = lazy(() => import('../features/staff/StaffHomePage'));
const StaffToolsPage = lazy(() => import('../features/staff/StaffToolsPage'));
const StaffProgressPage = lazy(() => import('../features/progress/StaffProgressPage'));
const StaffNutritionPage = lazy(() => import('../features/nutrition/StaffNutritionPage'));
const StaffSchedulePage = lazy(() => import('../features/classes/StaffSchedulePage'));
const StaffBookingsPage = lazy(() => import('../features/bookings/StaffBookingsPage'));
const StaffNotificationsPage = lazy(() => import('../features/notifications/StaffNotificationsPage'));
const StaffWorkoutProgramsPage = lazy(() => import('../features/workouts/StaffWorkoutProgramsPage'));
const StaffBillingPage = lazy(() => import('../features/billing/StaffBillingPage'));
const StaffPosPage = lazy(() => import('../features/pos/StaffPosPage'));
const StaffAccessControlPage = lazy(() => import('../features/access/StaffAccessControlPage'));
const StaffBlogEditorPage = lazy(() => import('../features/blog/StaffBlogEditorPage'));
const BlogPage = lazy(() => import('../features/blog/BlogPage'));
const BlogPostPage = lazy(() => import('../features/blog/BlogPostPage'));
const UtilityToolsPage = lazy(() => import('../features/publicSite/UtilityToolsPage'));
const GalleryPage = lazy(() => import('../features/publicSite/GalleryPage'));
const TestimonialsPage = lazy(() => import('../features/publicSite/TestimonialsPage'));
const EventsPage = lazy(() => import('../features/publicSite/EventsPage'));
const ContactPage = lazy(() => import('../features/publicSite/ContactPage'));
const FeedbackPage = lazy(() => import('../features/publicSite/FeedbackPage'));
const GymMapPage = lazy(() => import('../features/publicSite/GymMapPage'));
const NotFoundPage = lazy(() => import('../features/publicSite/NotFoundPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const AdminSecurityPage = lazy(() => import('../features/security/AdminSecurityPage'));
const SecurityRestrictionPage = lazy(() => import('../features/security/SecurityRestrictionPage'));
const AdminAccessControlPage = lazy(() => import('../features/access/AdminAccessControlPage'));
const AdminAccessHardwarePage = lazy(() => import('../features/access/AdminAccessHardwarePage'));
const AdminPlansPage = lazy(() => import('../features/plans/AdminPlansPage'));
const AdminFinancePage = lazy(() => import('../features/finance/AdminFinancePage'));
const AdminReportsPage = lazy(() => import('../features/reports/AdminReportsPage'));
const AdminCrmPage = lazy(() => import('../features/crm/AdminCrmPage'));
const AdminPosPage = lazy(() => import('../features/pos/AdminPosPage'));
const AdminBlogManagementPage = lazy(() => import('../features/blog/AdminBlogManagementPage'));
const AdminOperationsPage = lazy(() => import('../features/ops/AdminOperationsPage'));
const AdminProductionReadinessPage = lazy(() => import('../features/ops/AdminProductionReadinessPage'));

const AppRouter = () => (
  <Routes>
    <Route
      element={(
        <AppErrorBoundary>
          <AppShell />
        </AppErrorBoundary>
      )}
    >
      <Route path={PATHS.home} element={<HomePage />} />
      <Route path={PATHS.gallery} element={<GalleryPage />} />
      <Route path={PATHS.testimonials} element={<TestimonialsPage />} />
      <Route path={PATHS.events} element={<EventsPage />} />
      <Route path={PATHS.contact} element={<ContactPage />} />
      <Route path={PATHS.feedback} element={<FeedbackPage />} />
      <Route path={PATHS.gymMap} element={<GymMapPage />} />
      <Route path={PATHS.tools} element={<UtilityToolsPage />} />
      <Route path={PATHS.blog} element={<BlogPage />} />
      <Route path={PATHS.blogPost} element={<BlogPostPage />} />
      <Route path={PATHS.exerciseDetail} element={<ExerciseDetailPage />} />
      <Route path={PATHS.notFound} element={<NotFoundPage />} />
      <Route path={PATHS.securityRestricted} element={<SecurityRestrictionPage />} />

      <Route element={<GuestRoute />}>
        <Route path={PATHS.auth} element={<AuthPage />} />
        <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
      </Route>

      <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.dashboard} element={<DashboardPage />} />
        <Route path={PATHS.progress} element={<ProgressTrackingPage />} />
        <Route path={PATHS.nutrition} element={<NutritionPage />} />
        <Route path={PATHS.attendance} element={<AttendancePage />} />
        <Route path={PATHS.workoutPlan} element={<MemberWorkoutPlanPage />} />
        <Route path={PATHS.schedule} element={<ClassSchedulePage />} />
        <Route path={PATHS.bookings} element={<BookingsPage />} />
        <Route path={PATHS.notifications} element={<NotificationsPage />} />
        <Route path={PATHS.billing} element={<BillingPage />} />
        <Route path={PATHS.membership} element={<MembershipProfilePage />} />
        <Route path={PATHS.account} element={<AccountPage />} />
      </Route>

      <Route element={<StaffRoute />}>
        <Route path={PATHS.staff} element={<StaffHomePage />} />
        <Route path={PATHS.staffTools} element={<StaffToolsPage />} />
        <Route path={PATHS.staffProgress} element={<StaffProgressPage />} />
        <Route path={PATHS.staffNutrition} element={<StaffNutritionPage />} />
        <Route path={PATHS.staffSchedule} element={<StaffSchedulePage />} />
        <Route path={PATHS.staffBookings} element={<StaffBookingsPage />} />
        <Route path={PATHS.staffNotifications} element={<StaffNotificationsPage />} />
        <Route path={PATHS.staffWorkouts} element={<StaffWorkoutProgramsPage />} />
        <Route path={PATHS.staffBilling} element={<StaffBillingPage />} />
        <Route path={PATHS.staffPos} element={<StaffPosPage />} />
        <Route path={PATHS.staffAccess} element={<StaffAccessControlPage />} />
        <Route path={PATHS.staffBlog} element={<StaffBlogEditorPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path={PATHS.admin} element={<AdminPage />} />
        <Route path={PATHS.adminSecurity} element={<AdminSecurityPage />} />
        <Route path={PATHS.adminAccess} element={<AdminAccessControlPage />} />
        <Route path={PATHS.adminAccessHardware} element={<AdminAccessHardwarePage />} />
        <Route path={PATHS.adminPlans} element={<AdminPlansPage />} />
        <Route path={PATHS.adminFinance} element={<AdminFinancePage />} />
        <Route path={PATHS.adminReports} element={<AdminReportsPage />} />
        <Route path={PATHS.adminCrm} element={<AdminCrmPage />} />
        <Route path={PATHS.adminPos} element={<AdminPosPage />} />
        <Route path={PATHS.adminBlog} element={<AdminBlogManagementPage />} />
        <Route path={PATHS.adminOps} element={<AdminOperationsPage />} />
        <Route path={PATHS.adminProductionReadiness} element={<AdminProductionReadinessPage />} />
        <Route path={PATHS.memberDetail} element={<MemberDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to={PATHS.notFound} replace />} />
    </Route>
  </Routes>
);

export default AppRouter;
