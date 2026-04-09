import { formatCurrency } from '../billing/billingHelpers';

export const PLAN_DURATION_OPTIONS = [1, 3, 6, 12].map((months) => ({
  value: months,
  label: months === 12 ? '1 year' : `${months} month${months > 1 ? 's' : ''}`,
}));

export const ADD_ON_CATEGORY_OPTIONS = [
  { value: 'personal_training', label: 'Personal training' },
  { value: 'mma', label: 'MMA' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'general', label: 'General' },
];

export const ADD_ON_BILLING_FREQUENCY_OPTIONS = [
  { value: 'recurring', label: 'Recurring' },
  { value: 'one_time', label: 'One-time' },
];

export const DEFAULT_PRICING_PREVIEW = [
  {
    code: 'membership_1m',
    name: '1 Month Membership',
    durationMonths: 1,
    price: 2000,
    type: 'membership',
  },
  {
    code: 'membership_3m',
    name: '3 Month Membership',
    durationMonths: 3,
    price: 6000,
    type: 'membership',
  },
  {
    code: 'membership_6m',
    name: '6 Month Membership',
    durationMonths: 6,
    price: 10000,
    type: 'membership',
  },
  {
    code: 'membership_12m',
    name: '1 Year Membership',
    durationMonths: 12,
    price: 15000,
    type: 'membership',
  },
  {
    code: 'personal_training',
    name: 'Personal Training',
    price: 10000,
    type: 'add_on',
  },
  {
    code: 'mma',
    name: 'MMA',
    price: 8000,
    type: 'add_on',
  },
  {
    code: 'boxing',
    name: 'Boxing',
    price: 8000,
    type: 'add_on',
  },
  {
    code: 'yoga',
    name: 'Yoga',
    price: 6000,
    type: 'add_on',
  },
];

export const createEmptyPlanCatalogForm = () => ({
  id: '',
  name: '',
  plan_code: '',
  description: '',
  price: '',
  duration_months: 1,
  billing_cycle: 'month',
  duration_weeks: 4,
  currency_code: 'INR',
  display_order: 0,
  is_active: true,
});

export const createEmptyAddOnForm = () => ({
  id: '',
  add_on_code: '',
  name: '',
  description: '',
  category: 'general',
  price: '',
  billing_frequency: 'recurring',
  currency_code: 'INR',
  sort_order: 0,
  is_active: true,
});

export const createEmptySubscriptionBundleForm = () => ({
  memberId: '',
  planId: '',
  addOnIds: [],
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  discountAmount: '',
  notes: '',
  sendEmail: true,
});

export const describeDuration = (months) => {
  const nextMonths = Number(months || 0);

  if (nextMonths === 12) {
    return '1 year';
  }

  if (nextMonths === 1) {
    return '1 month';
  }

  return `${nextMonths} months`;
};

export const buildPlanSummaryLabel = (plan = {}) => {
  const priceLabel = formatCurrency(plan.price, plan.currency_code || 'INR');
  const durationLabel = describeDuration(plan.duration_months || 1);
  return `${durationLabel} • ${priceLabel}`;
};

export const buildBundlePreviewTotal = ({
  selectedPlan = null,
  selectedAddOns = [],
  discountAmount = 0,
}) => {
  const planValue = Number(selectedPlan?.price || 0);
  const addOnValue = selectedAddOns.reduce((sum, addOn) => sum + Number(addOn?.price || 0), 0);
  const discountValue = Math.max(0, Number(discountAmount || 0));
  return Math.max(0, Number((planValue + addOnValue - discountValue).toFixed(2)));
};

export const getAddOnCategoryLabel = (value) => (
  ADD_ON_CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value || 'General'
);

export const getAddOnBillingFrequencyLabel = (value) => (
  ADD_ON_BILLING_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label || value || 'Recurring'
);

export const normalisePlanForm = (plan = {}) => ({
  id: plan.id || '',
  name: plan.name || '',
  plan_code: plan.plan_code || '',
  description: plan.description || '',
  price: plan.price ?? '',
  duration_months: plan.duration_months ?? 1,
  billing_cycle: plan.billing_cycle || 'month',
  duration_weeks: plan.duration_weeks ?? Math.max(Number(plan.duration_months || 1) * 4, 4),
  currency_code: plan.currency_code || 'INR',
  display_order: plan.display_order ?? 0,
  is_active: plan.is_active !== false,
});

export const normaliseAddOnForm = (addOn = {}) => ({
  id: addOn.id || '',
  add_on_code: addOn.add_on_code || '',
  name: addOn.name || '',
  description: addOn.description || '',
  category: addOn.category || 'general',
  price: addOn.price ?? '',
  billing_frequency: addOn.billing_frequency || 'recurring',
  currency_code: addOn.currency_code || 'INR',
  sort_order: addOn.sort_order ?? 0,
  is_active: addOn.is_active !== false,
});
