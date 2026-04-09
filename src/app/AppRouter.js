import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import HomePage from '../features/exercises/pages/HomePage';
import ExerciseDetailPage from '../features/exercises/pages/ExerciseDetailPage';
import AuthPage from '../features/auth/AuthPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import ProgressTrackingPage from '../features/progress/ProgressTrackingPage';
import NutritionPage from '../features/nutrition/NutritionPage';
import AttendancePage from '../features/attendance/AttendancePage';
import MemberWorkoutPlanPage from '../features/workouts/MemberWorkoutPlanPage';
import ClassSchedulePage from '../features/classes/ClassSchedulePage';
import BookingsPage from '../features/bookings/BookingsPage';
import NotificationsPage from '../features/notifications/NotificationsPage';
import BillingPage from '../features/billing/BillingPage';
import MembershipProfilePage from '../features/members/MemberProfilePage';
import MemberDetailPage from '../features/members/MemberDetailPage';
import AccountPage from '../features/account/AccountPage';
import StaffHomePage from '../features/staff/StaffHomePage';
import StaffToolsPage from '../features/staff/StaffToolsPage';
import StaffProgressPage from '../features/progress/StaffProgressPage';
import StaffNutritionPage from '../features/nutrition/StaffNutritionPage';
import StaffSchedulePage from '../features/classes/StaffSchedulePage';
import StaffBookingsPage from '../features/bookings/StaffBookingsPage';
import StaffNotificationsPage from '../features/notifications/StaffNotificationsPage';
import StaffWorkoutProgramsPage from '../features/workouts/StaffWorkoutProgramsPage';
import StaffBillingPage from '../features/billing/StaffBillingPage';
import StaffPosPage from '../features/pos/StaffPosPage';
import AdminPage from '../features/admin/AdminPage';
import AdminPlansPage from '../features/plans/AdminPlansPage';
import AdminFinancePage from '../features/finance/AdminFinancePage';
import AdminReportsPage from '../features/reports/AdminReportsPage';
import AdminCrmPage from '../features/crm/AdminCrmPage';
import AdminPosPage from '../features/pos/AdminPosPage';
import GuestRoute from '../routes/GuestRoute';
import ProtectedRoute from '../routes/ProtectedRoute';
import StaffRoute from '../routes/StaffRoute';
import AdminRoute from '../routes/AdminRoute';
import AppShell from './AppShell';
import { PATHS } from './paths';

const AppRouter = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path={PATHS.home} element={<HomePage />} />
      <Route path={PATHS.exerciseDetail} element={<ExerciseDetailPage />} />

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
      </Route>

      <Route element={<AdminRoute />}>
        <Route path={PATHS.admin} element={<AdminPage />} />
        <Route path={PATHS.adminPlans} element={<AdminPlansPage />} />
        <Route path={PATHS.adminFinance} element={<AdminFinancePage />} />
        <Route path={PATHS.adminReports} element={<AdminReportsPage />} />
        <Route path={PATHS.adminCrm} element={<AdminCrmPage />} />
        <Route path={PATHS.adminPos} element={<AdminPosPage />} />
        <Route path={PATHS.memberDetail} element={<MemberDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to={PATHS.home} replace />} />
    </Route>
  </Routes>
);

export default AppRouter;
