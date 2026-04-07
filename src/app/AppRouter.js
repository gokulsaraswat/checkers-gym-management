
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import HomePage from '../features/exercises/pages/HomePage';
import ExerciseDetailPage from '../features/exercises/pages/ExerciseDetailPage';
import AuthPage from '../features/auth/AuthPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import AttendancePage from '../features/attendance/AttendancePage';
import ClassSchedulePage from '../features/classes/ClassSchedulePage';
import MembershipProfilePage from '../features/members/MemberProfilePage';
import MemberDetailPage from '../features/members/MemberDetailPage';
import AccountPage from '../features/account/AccountPage';
import StaffHomePage from '../features/staff/StaffHomePage';
import StaffSchedulePage from '../features/classes/StaffSchedulePage';
import AdminPage from '../features/admin/AdminPage';
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
        <Route path={PATHS.attendance} element={<AttendancePage />} />
        <Route path={PATHS.schedule} element={<ClassSchedulePage />} />
        <Route path={PATHS.membership} element={<MembershipProfilePage />} />
        <Route path={PATHS.account} element={<AccountPage />} />
      </Route>

      <Route element={<StaffRoute />}>
        <Route path={PATHS.staff} element={<StaffHomePage />} />
        <Route path={PATHS.staffSchedule} element={<StaffSchedulePage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path={PATHS.admin} element={<AdminPage />} />
        <Route path={PATHS.memberDetail} element={<MemberDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to={PATHS.home} replace />} />
    </Route>
  </Routes>
);

export default AppRouter;
