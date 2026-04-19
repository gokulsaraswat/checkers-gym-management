const toIsoDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export const publicWebsiteHighlights = [
  {
    label: 'Public pages',
    value: '6',
    caption: 'Gallery, stories, events, contact, feedback, and map.',
  },
  {
    label: 'Seeded content',
    value: 'Editable',
    caption: 'Swap copy, media, and branch details from one content file.',
  },
  {
    label: 'Best for',
    value: 'Discovery',
    caption: 'Useful for leads, visitors, and community updates.',
  },
];

export const galleryCollections = [
  {
    id: 'strength-floor',
    title: 'Strength floor',
    subtitle: 'Barbell bays, dumbbell lanes, benches, and coach sightlines.',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
    tags: ['Strength', 'Coaching', 'Open gym'],
    bullets: [
      'Highlight progression-friendly racks and free-weight flow.',
      'Use before-and-after stories or PR moments from this zone.',
      'Works well for transformation posts and trainer intros.',
    ],
  },
  {
    id: 'functional-zone',
    title: 'Functional and conditioning lane',
    subtitle: 'Turf work, sled pushes, circuits, and small-group sessions.',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80',
    tags: ['Conditioning', 'Turf', 'Group training'],
    bullets: [
      'Show circuit formats, warm-up flows, and athletic prep sessions.',
      'Useful for bootcamps, HIIT, and sports conditioning content.',
      'Pairs naturally with event-day media and class promotions.',
    ],
  },
  {
    id: 'studio-space',
    title: 'Studio and class space',
    subtitle: 'Mobility sessions, coached classes, and community workshops.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
    tags: ['Classes', 'Mobility', 'Workshops'],
    bullets: [
      'Spotlight class atmosphere, onboarding sessions, and themed clinics.',
      'A good home for female-only batches, recovery demos, or beginner sessions.',
      'Can be linked directly from events and schedule promotions.',
    ],
  },
  {
    id: 'community-moments',
    title: 'Community moments',
    subtitle: 'Challenge days, celebrations, showcase boards, and member wins.',
    imageUrl: 'https://images.unsplash.com/photo-1517130038641-a774d04afb3c?auto=format&fit=crop&w=1200&q=80',
    tags: ['Community', 'Events', 'Milestones'],
    bullets: [
      'Collect event photos, coach shout-outs, and milestone check-ins.',
      'Use as the bridge between the blog, testimonials, and gallery.',
      'Ideal for migrating media from an older brochure-style website.',
    ],
  },
  {
    id: 'recovery-corner',
    title: 'Recovery and guidance corners',
    subtitle: 'Assessment desks, recovery guidance, and focused consultations.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
    tags: ['Recovery', 'Assessments', 'Consultations'],
    bullets: [
      'Add coach consult photos, recovery tips, and onboarding snapshots.',
      'Useful for nutrition, progress, and accountability storytelling.',
      'Can carry FAQ content for first-time visitors and member support.',
    ],
  },
  {
    id: 'brand-details',
    title: 'Brand and wayfinding details',
    subtitle: 'Signage, welcome desk, product shelves, and directional moments.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    tags: ['Branding', 'Welcome', 'Navigation'],
    bullets: [
      'Capture front-desk flow, signage, and branded corners for web consistency.',
      'Supports contact, map, and onboarding pages with real branch cues.',
      'Easy win when migrating old-site content into a cleaner public structure.',
    ],
  },
];

export const testimonials = [
  {
    id: 'ritika-strength',
    name: 'Ritika',
    role: 'Strength member',
    rating: 5,
    focus: ['Strength training', 'Consistency', 'Coach accountability'],
    headline: 'A simpler routine turned into a habit I could actually keep.',
    quote: 'The biggest change was structure. I stopped guessing what to do each week and started showing up with a plan that matched my schedule and recovery.',
    outcome: 'Built a repeatable three-day training rhythm and better confidence on the gym floor.',
  },
  {
    id: 'aman-beginner',
    name: 'Aman',
    role: 'Beginner transformation member',
    rating: 5,
    focus: ['Onboarding', 'Technique', 'Fat-loss support'],
    headline: 'The first-visit guidance made the gym feel approachable instead of overwhelming.',
    quote: 'I liked that the team explained where to start, what to track, and how to pace progress. It felt more like coaching and less like being dropped into a busy room.',
    outcome: 'Moved from uncertain trial visits to a stable beginner program with measurable progress.',
  },
  {
    id: 'isha-community',
    name: 'Isha',
    role: 'Community and class member',
    rating: 5,
    focus: ['Small-group sessions', 'Mobility', 'Community'],
    headline: 'The gym became easier to stick with once I felt connected to the people around me.',
    quote: 'Class days, challenge check-ins, and the way coaches remembered my goals made it easier to keep momentum. The environment felt personal without being intense all the time.',
    outcome: 'Stayed consistent through classes, recovery work, and community events.',
  },
  {
    id: 'vikram-performance',
    name: 'Vikram',
    role: 'Performance-focused member',
    rating: 4,
    focus: ['Performance', 'Conditioning', 'Event prep'],
    headline: 'The conditioning zone and structured sessions gave me a better training edge.',
    quote: 'I used to train hard but not always smart. Having defined blocks for conditioning, recovery, and strength made the workload easier to manage.',
    outcome: 'Improved conditioning output while keeping strength work balanced.',
  },
  {
    id: 'neha-restart',
    name: 'Neha',
    role: 'Restarting member',
    rating: 5,
    focus: ['Comeback journey', 'Confidence', 'Supportive environment'],
    headline: 'Returning after a long break felt realistic because the plan was paced well.',
    quote: 'The staff helped me restart without guilt or pressure. The progress markers were small, but they kept me motivated enough to continue week after week.',
    outcome: 'Rebuilt confidence, routine, and comfort with training again.',
  },
  {
    id: 'rohan-coaching',
    name: 'Rohan',
    role: 'Coached member',
    rating: 5,
    focus: ['Programming', 'Progress review', 'Goal alignment'],
    headline: 'Regular check-ins helped me connect daily effort to bigger goals.',
    quote: 'The difference was not just the workouts. It was the feedback loop—what improved, what needed adjustment, and what to focus on next.',
    outcome: 'Saw clearer progress because each block had context and review points.',
  },
];

export const upcomingEvents = [
  {
    id: 'open-house-week',
    title: 'Open house and first-visit week',
    category: 'Community onboarding',
    audience: 'Prospects and friends of members',
    startDate: toIsoDate(10),
    endDate: toIsoDate(16),
    summary: 'A week built for discovery visits, coached walk-throughs, and beginner-friendly floor guidance.',
    bullets: [
      'Intro tours for first-time visitors.',
      'Short trainer consult windows for goal-based guidance.',
      'Easy content set for gallery updates and website highlights.',
    ],
  },
  {
    id: 'strength-clinic',
    title: 'Barbell foundations clinic',
    category: 'Technique workshop',
    audience: 'Members and new lifters',
    startDate: toIsoDate(22),
    endDate: toIsoDate(22),
    summary: 'A coach-led session covering setup, movement standards, and confidence for key barbell patterns.',
    bullets: [
      'Focused cueing for squat, hinge, and pressing basics.',
      'Useful bridge between onboarding and regular programming.',
      'Great candidate for recap posts and testimonial capture.',
    ],
  },
  {
    id: 'conditioning-challenge',
    title: 'Team conditioning challenge',
    category: 'Community event',
    audience: 'Members and small groups',
    startDate: toIsoDate(35),
    endDate: toIsoDate(35),
    summary: 'An in-house challenge day that turns conditioning work into a shared community experience.',
    bullets: [
      'Partner or squad-based participation format.',
      'Simple scoreboard moments for social clips and gallery media.',
      'Works well with referrals, team sign-ups, and member spotlights.',
    ],
  },
  {
    id: 'mobility-reset',
    title: 'Mobility and recovery reset',
    category: 'Recovery focus',
    audience: 'Members restarting or deloading',
    startDate: toIsoDate(49),
    endDate: toIsoDate(49),
    summary: 'A lighter session focused on movement quality, recovery habits, and staying consistent around busy weeks.',
    bullets: [
      'Good touchpoint for members returning after travel or time off.',
      'Pairs naturally with recovery media and blog content.',
      'Can support nutrition and accountability follow-ups.',
    ],
  },
];

export const contactChannels = [
  {
    id: 'front-desk',
    title: 'Front desk and first visits',
    description: 'Best for trial visits, membership walkthroughs, and general facility questions.',
    supportWindow: 'Seed with your live front-desk contact details.',
  },
  {
    id: 'coach-consult',
    title: 'Coach consultations',
    description: 'Use for goal-setting conversations, onboarding guidance, and finding the right training format.',
    supportWindow: 'Good fit for strength, fat-loss, beginner, or return-to-training journeys.',
  },
  {
    id: 'community-events',
    title: 'Events and partnerships',
    description: 'For workshops, competitions, member activations, and collaboration enquiries.',
    supportWindow: 'Useful if you run challenge days, school outreach, or community campaigns.',
  },
  {
    id: 'member-support',
    title: 'Member support and feedback',
    description: 'A cleaner route for questions, ideas, service issues, and follow-up after a visit.',
    supportWindow: 'Connect this to your preferred inbox, WhatsApp, or CRM workflow later.',
  },
];

export const visitPlanningSteps = [
  {
    title: 'Plan the first visit',
    description: 'Use the public pages to explain what a new visitor can expect, what to bring, and which zone to start with.',
  },
  {
    title: 'Match the right format',
    description: 'Point visitors toward open-gym access, coached sessions, classes, or goal consultations without forcing a hard sell.',
  },
  {
    title: 'Keep the follow-up simple',
    description: 'Route questions into feedback or contact workflows so the website stays useful even before deeper CRM automation.',
  },
];

export const publicFaqs = [
  {
    question: 'What should I use these public pages for?',
    answer: 'They are meant to help visitors understand the gym vibe, upcoming community activity, contact pathways, and what a first visit could look like before they enter the member app.',
  },
  {
    question: 'Can I replace the seeded media and copy?',
    answer: 'Yes. Patch 31 keeps the public content centralized so old website copy, real branch photos, and actual contact details can be swapped in without redesigning every page.',
  },
  {
    question: 'Does the map page support a real location or 3D walkthrough?',
    answer: 'Yes. The patch includes placeholders for an optional location map embed and an optional 3D walkthrough embed. Add those URLs when the branch assets are ready.',
  },
  {
    question: 'Can these pages work without new backend tables?',
    answer: 'Yes. This patch is intentionally frontend-first so the public website can expand before heavier operations or content workflows are introduced.',
  },
];

export const gymZones = [
  {
    id: 'reception',
    title: 'Reception and check-in',
    level: 'Entry',
    span: 2,
    description: 'Welcome desk, enquiries, and the best spot to guide first-time visitors.',
  },
  {
    id: 'strength-floor',
    title: 'Strength floor',
    level: 'Main floor',
    span: 2,
    description: 'Racks, benches, and progressive strength work for coached or self-guided sessions.',
  },
  {
    id: 'conditioning-lane',
    title: 'Conditioning lane',
    level: 'Main floor',
    span: 1,
    description: 'Turf drills, circuits, sled pushes, and event-day challenges.',
  },
  {
    id: 'studio',
    title: 'Studio space',
    level: 'Upper or side zone',
    span: 1,
    description: 'Classes, workshops, mobility sessions, and beginner walk-throughs.',
  },
  {
    id: 'recovery',
    title: 'Recovery corner',
    level: 'Quiet zone',
    span: 1,
    description: 'Consults, lighter movement work, and reset-focused sessions.',
  },
  {
    id: 'member-lounge',
    title: 'Member lounge and support',
    level: 'Service zone',
    span: 1,
    description: 'Quick discussions, content wall, product shelf, or consultation waiting area.',
  },
];

export const facilityHighlights = [
  'Create a simple floor legend for visitors before they arrive.',
  'Use the same page for branch tours, onboarding screenshots, and community walk-throughs.',
  'Plug in an optional 3D tour or map embed later without restructuring the page.',
];

export const locationEmbedConfig = {
  mapEmbedUrl: '',
  tourEmbedUrl: '',
  embedHint: 'Replace the optional map or 3D URLs in publicSiteContent.js when your live branch assets are ready.',
};

export const feedbackTopics = [
  { value: 'experience', label: 'Overall experience' },
  { value: 'coaching', label: 'Coaching and support' },
  { value: 'facility', label: 'Facility and equipment' },
  { value: 'community', label: 'Community and events' },
  { value: 'website', label: 'Website and information' },
  { value: 'suggestion', label: 'Suggestion or request' },
];

export const visitTypeOptions = [
  { value: 'first-visit', label: 'First visit / trial' },
  { value: 'member', label: 'Current member' },
  { value: 'returning', label: 'Returning after a break' },
  { value: 'event', label: 'Event or community day' },
];
