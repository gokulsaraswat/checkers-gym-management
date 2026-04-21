export const getErrorMessage = (error, fallbackMessage = 'Something went wrong while preparing this view.') => {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }

  return fallbackMessage;
};

export const defaultRouteFallbackTips = [
  'Refresh once to recover temporary client or session state.',
  'If you opened a deep link from an old bookmark, reopen the page from the homepage or dashboard.',
  'If the problem keeps happening, use the contact page so staff can verify the route and access state.',
];

export const defaultNotFoundTips = [
  'Check the address for typing mistakes, missing IDs, or copied query strings.',
  'Public pages and member/admin tools now live in separate route families, so old links can miss the correct section.',
  'Use the homepage, blog, or contact page if you are unsure where the content moved.',
];
