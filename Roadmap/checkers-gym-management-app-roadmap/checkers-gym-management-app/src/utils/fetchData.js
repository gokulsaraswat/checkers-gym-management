import { sampleBodyParts, sampleExercises, sampleVideos } from '../data/sampleExercises';

export const isRapidApiConfigured = Boolean(process.env.REACT_APP_RAPID_API_KEY);

export const exerciseOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
  },
};

export const youtubeOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com',
    'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
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

export const fetchData = async (url, options) => {
  if (!isRapidApiConfigured) {
    return fallbackResponse(url);
  }

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    return fallbackResponse(url);
  }
};
