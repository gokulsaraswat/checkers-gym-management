import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { PATHS } from '../../app/paths';

const routeMatchers = [
  { matches: (pathname) => pathname === PATHS.home, label: 'Home' },
  { matches: (pathname) => pathname === PATHS.gallery, label: 'Gallery' },
  { matches: (pathname) => pathname === PATHS.testimonials, label: 'Testimonials' },
  { matches: (pathname) => pathname === PATHS.events, label: 'Events' },
  { matches: (pathname) => pathname === PATHS.contact, label: 'Contact' },
  { matches: (pathname) => pathname === PATHS.feedback, label: 'Feedback' },
  { matches: (pathname) => pathname === PATHS.gymMap, label: 'Gym map' },
  { matches: (pathname) => pathname === PATHS.tools, label: 'Utility tools' },
  { matches: (pathname) => pathname === PATHS.blog, label: 'Blog' },
  { matches: (pathname) => pathname.startsWith('/blog/'), label: 'Blog post' },
  { matches: (pathname) => pathname.startsWith('/exercise/'), label: 'Exercise details' },
  { matches: (pathname) => pathname === PATHS.auth, label: 'Login and signup' },
  { matches: (pathname) => pathname === PATHS.forgotPassword, label: 'Forgot password' },
  { matches: (pathname) => pathname === PATHS.resetPassword, label: 'Reset password' },
  { matches: (pathname) => pathname === PATHS.dashboard, label: 'Dashboard' },
  { matches: (pathname) => pathname === PATHS.progress, label: 'Progress tracking' },
  { matches: (pathname) => pathname === PATHS.nutrition, label: 'Nutrition' },
  { matches: (pathname) => pathname === PATHS.attendance, label: 'Attendance' },
  { matches: (pathname) => pathname === PATHS.workoutPlan, label: 'Workout plan' },
  { matches: (pathname) => pathname === PATHS.schedule, label: 'Class schedule' },
  { matches: (pathname) => pathname === PATHS.bookings, label: 'Bookings' },
  { matches: (pathname) => pathname === PATHS.notifications, label: 'Notifications' },
  { matches: (pathname) => pathname === PATHS.billing, label: 'Billing' },
  { matches: (pathname) => pathname === PATHS.membership, label: 'Membership profile' },
  { matches: (pathname) => pathname === PATHS.account, label: 'Account' },
  { matches: (pathname) => pathname === PATHS.staff, label: 'Staff home' },
  { matches: (pathname) => pathname === PATHS.staffTools, label: 'Staff tools' },
  { matches: (pathname) => pathname === PATHS.staffProgress, label: 'Staff progress' },
  { matches: (pathname) => pathname === PATHS.staffNutrition, label: 'Staff nutrition' },
  { matches: (pathname) => pathname === PATHS.staffSchedule, label: 'Staff schedule' },
  { matches: (pathname) => pathname === PATHS.staffBookings, label: 'Staff bookings' },
  { matches: (pathname) => pathname === PATHS.staffNotifications, label: 'Staff notifications' },
  { matches: (pathname) => pathname === PATHS.staffWorkouts, label: 'Staff workouts' },
  { matches: (pathname) => pathname === PATHS.staffBilling, label: 'Staff billing' },
  { matches: (pathname) => pathname === PATHS.staffPos, label: 'Staff POS' },
  { matches: (pathname) => pathname === PATHS.staffAccess, label: 'Staff access control' },
  { matches: (pathname) => pathname === PATHS.staffBlog, label: 'Staff blog editor' },
  { matches: (pathname) => pathname === PATHS.admin, label: 'Admin workspace' },
  { matches: (pathname) => pathname === PATHS.adminSecurity, label: 'Admin security' },
  { matches: (pathname) => pathname === PATHS.adminAccess, label: 'Admin access control' },
  { matches: (pathname) => pathname === PATHS.adminAccessHardware, label: 'Access hardware' },
  { matches: (pathname) => pathname === PATHS.adminPlans, label: 'Admin plans' },
  { matches: (pathname) => pathname === PATHS.adminFinance, label: 'Admin finance' },
  { matches: (pathname) => pathname === PATHS.adminReports, label: 'Admin reports' },
  { matches: (pathname) => pathname === PATHS.adminCrm, label: 'Admin CRM' },
  { matches: (pathname) => pathname === PATHS.adminPos, label: 'Admin POS' },
  { matches: (pathname) => pathname === PATHS.adminBlog, label: 'Admin blog management' },
  { matches: (pathname) => pathname.startsWith('/admin/members/'), label: 'Member details' },
  { matches: (pathname) => pathname === PATHS.securityRestricted, label: 'Security restricted' },
  { matches: (pathname) => pathname === PATHS.notFound, label: 'Page not found' },
];

const fallbackLabel = (pathname) => {
  if (!pathname || pathname === '/') {
    return 'Home';
  }

  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[-_]/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' • ');
};

const getRouteLabel = (pathname) => {
  const matchedRoute = routeMatchers.find((matcher) => matcher.matches(pathname));
  return matchedRoute?.label || fallbackLabel(pathname);
};

const runNextFrame = (callback) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(callback, 0);
};

const cancelScheduledFrame = (handle) => {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle);
    return;
  }

  window.clearTimeout(handle);
};

const RouteAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const routeLabel = useMemo(() => getRouteLabel(location.pathname), [location.pathname]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `Checkers Gym • ${routeLabel}`;
    }
  }, [routeLabel]);

  useEffect(() => {
    const announcementHandle = runNextFrame(() => {
      setAnnouncement(`${routeLabel} loaded`);
    });

    return () => {
      cancelScheduledFrame(announcementHandle);
    };
  }, [routeLabel]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
};

export default RouteAnnouncer;
