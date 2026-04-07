export const BOOKING_STATUS_META = {
  booked: {
    label: 'Booked',
    background: '#ecfdf3',
    color: '#047857',
  },
  waitlist: {
    label: 'Waitlist',
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  attended: {
    label: 'Attended',
    background: '#fef3c7',
    color: '#92400e',
  },
  missed: {
    label: 'Missed',
    background: '#fef2f2',
    color: '#b91c1c',
  },
  cancelled: {
    label: 'Cancelled',
    background: '#f8fafc',
    color: '#475569',
  },
  none: {
    label: 'Not booked',
    background: '#f8fafc',
    color: '#475569',
  },
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const nextValue = new Date(value);
  return Number.isNaN(nextValue.getTime()) ? null : nextValue;
};

export const getBookingStatusLabel = (status) => (
  BOOKING_STATUS_META[status]?.label || 'Scheduled'
);

export const getBookingStatusChipSx = (status) => ({
  bgcolor: BOOKING_STATUS_META[status]?.background || '#f8fafc',
  color: BOOKING_STATUS_META[status]?.color || '#475569',
  fontWeight: 700,
});

export const getAvailabilityMeta = (session = {}) => {
  const remainingSpots = Number(session.remaining_spots || 0);
  const waitlistCount = Number(session.waitlist_count || 0);

  if (session.my_booking_status === 'booked') {
    return {
      label: 'You are booked',
      background: '#ecfdf3',
      color: '#047857',
    };
  }

  if (session.my_booking_status === 'waitlist') {
    return {
      label: session.my_waitlist_position
        ? `Waitlist #${session.my_waitlist_position}`
        : 'You are waitlisted',
      background: '#eff6ff',
      color: '#1d4ed8',
    };
  }

  if (remainingSpots > 0) {
    return {
      label: `${remainingSpots} spot${remainingSpots === 1 ? '' : 's'} left`,
      background: '#f0fdf4',
      color: '#166534',
    };
  }

  return {
    label: waitlistCount > 0 ? `${waitlistCount} on waitlist` : 'Class full',
    background: '#fff7ed',
    color: '#b45309',
  };
};

export const getAvailabilityChipSx = (session = {}) => ({
  bgcolor: getAvailabilityMeta(session).background,
  color: getAvailabilityMeta(session).color,
  fontWeight: 700,
});

export const describeCapacity = (session = {}) => {
  const bookedCount = Number(session.booked_count || 0);
  const capacity = Number(session.capacity || 0);
  const waitlistCount = Number(session.waitlist_count || 0);

  if (waitlistCount > 0) {
    return `${bookedCount}/${capacity} booked • ${waitlistCount} waitlisted`;
  }

  return `${bookedCount}/${capacity} booked`;
};

export const getMemberBookingAction = (session = {}) => {
  const alreadyBooked = session.my_booking_status === 'booked';
  const alreadyWaitlisted = session.my_booking_status === 'waitlist';
  const remainingSpots = Number(session.remaining_spots || 0);
  const isClosed = !session.is_active || session.schedule_status !== 'scheduled';

  if (isClosed) {
    return {
      mode: 'closed',
      label: 'Unavailable',
      disabled: true,
      variant: 'outlined',
    };
  }

  if (alreadyBooked) {
    return {
      mode: 'cancel',
      label: 'Cancel booking',
      disabled: false,
      variant: 'outlined',
    };
  }

  if (alreadyWaitlisted) {
    return {
      mode: 'cancel',
      label: 'Leave waitlist',
      disabled: false,
      variant: 'outlined',
    };
  }

  if (remainingSpots > 0) {
    return {
      mode: 'book',
      label: 'Book spot',
      disabled: false,
      variant: 'contained',
    };
  }

  return {
    mode: 'waitlist',
    label: 'Join waitlist',
    disabled: false,
    variant: 'contained',
  };
};

export const buildScheduleBookingStats = (sessions = []) => ({
  bookedByMe: sessions.filter((session) => session.my_booking_status === 'booked').length,
  waitlistedByMe: sessions.filter((session) => session.my_booking_status === 'waitlist').length,
  openSpots: sessions.reduce((total, session) => total + Number(session.remaining_spots || 0), 0),
  fullClasses: sessions.filter((session) => Number(session.remaining_spots || 0) === 0).length,
});

export const sortBookingsBySessionTime = (bookings = []) => (
  [...bookings].sort((left, right) => {
    const leftValue = toDate(left?.class_session?.starts_at)?.getTime() || 0;
    const rightValue = toDate(right?.class_session?.starts_at)?.getTime() || 0;
    return leftValue - rightValue;
  })
);

export const buildBookingPageStats = (bookings = []) => {
  const now = Date.now();

  const active = bookings.filter((booking) => ['booked', 'waitlist'].includes(booking.booking_status));
  const upcoming = active.filter((booking) => {
    const startsAt = toDate(booking?.class_session?.starts_at)?.getTime() || 0;
    return startsAt >= now;
  });

  return {
    activeCount: active.length,
    bookedCount: upcoming.filter((booking) => booking.booking_status === 'booked').length,
    waitlistCount: upcoming.filter((booking) => booking.booking_status === 'waitlist').length,
    completedCount: bookings.filter((booking) => ['attended', 'missed'].includes(booking.booking_status)).length,
  };
};

export const splitBookings = (bookings = []) => {
  const now = Date.now();
  const sorted = sortBookingsBySessionTime(bookings);

  return {
    upcoming: sorted.filter((booking) => {
      const startsAt = toDate(booking?.class_session?.starts_at)?.getTime() || 0;
      return startsAt >= now && ['booked', 'waitlist'].includes(booking.booking_status);
    }),
    history: sorted
      .filter((booking) => {
        const startsAt = toDate(booking?.class_session?.starts_at)?.getTime() || 0;
        return startsAt < now || !['booked', 'waitlist'].includes(booking.booking_status);
      })
      .reverse(),
  };
};

export const buildRosterStats = (roster = []) => ({
  bookedCount: roster.filter((booking) => booking.booking_status === 'booked').length,
  waitlistCount: roster.filter((booking) => booking.booking_status === 'waitlist').length,
  attendedCount: roster.filter((booking) => booking.booking_status === 'attended').length,
  cancelledCount: roster.filter((booking) => booking.booking_status === 'cancelled').length,
});

export const formatWaitlistLabel = (booking = {}) => (
  booking.waitlist_position ? `Waitlist #${booking.waitlist_position}` : 'Waitlist'
);
