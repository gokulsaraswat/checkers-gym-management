import { appEnv, isRapidApiEnvReady } from '../app/config/env';
import { sampleBodyParts, sampleExercises, sampleVideos } from '../data/sampleExercises';

export const isRapidApiConfigured = isRapidApiEnvReady;

export const exerciseOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    'X-RapidAPI-Key': appEnv.rapidApiKey,
  },
};

export const youtubeOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com',
    'X-RapidAPI-Key': appEnv.rapidApiKey,
  },
};

const normalise = (value) => decodeURIComponent(value || '').toLowerCase();

const fallbackResponse = (url) => {
  if (url.includes('youtube-search-and-download')) {
    return { contents: sampleVideos };
  }

  if (url.includes('/exercises/bodyPartList')) {
    return sampleBodyParts;
  }

  if (url.includes('/exercises/exercise/')) {
    const id = normalise(url.split('/').pop());
    return sampleExercises.find((exercise) => exercise.id.toLowerCase() === id) || sampleExercises[0];
  }

  if (url.includes('/exercises/target/')) {
    const target = normalise(url.split('/').pop());
    return sampleExercises.filter((exercise) => exercise.target.toLowerCase() === target);
  }

  if (url.includes('/exercises/equipment/')) {
    const equipment = normalise(url.split('/').pop());
    return sampleExercises.filter((exercise) => exercise.equipment.toLowerCase() === equipment);
  }

  if (url.includes('/exercises/bodyPart/')) {
    const bodyPart = normalise(url.split('/').pop());

    if (bodyPart === 'all') {
      return sampleExercises;
    }

    return sampleExercises.filter((exercise) => exercise.bodyPart.toLowerCase() === bodyPart);
  }

  if (url.includes('/exercises')) {
    return sampleExercises;
  }

  return [];
};

/**
 * Fetch live exercise data, falling back to the bundled sample library.
 *
 * Returns `{ data, isFallback }` so callers can tell real API results apart from
 * sample data — a silent fallback used to look identical to a successful call.
 */
export const fetchDataWithStatus = async (url, options) => {
  if (!isRapidApiConfigured) {
    return { data: fallbackResponse(url), isFallback: true };
  }

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    return { data: await res.json(), isFallback: false };
  } catch (error) {
    return { data: fallbackResponse(url), isFallback: true };
  }
};

export const fetchData = async (url, options) => {
  const { data } = await fetchDataWithStatus(url, options);
  return data;
};

export const FALLBACK_EXERCISE_MESSAGE = 'Showing sample exercises — live exercise data is unavailable right now.';
