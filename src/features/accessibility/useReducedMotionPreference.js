import { useMediaQuery } from '@mui/material';

const useReducedMotionPreference = () => useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });

export default useReducedMotionPreference;
