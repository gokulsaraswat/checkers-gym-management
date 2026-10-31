import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { exerciseOptions, FALLBACK_EXERCISE_MESSAGE, fetchDataWithStatus } from '../utils/fetchData';
import HorizontalScrollbar from './HorizontalScrollbar';

const SearchExercises = ({ setExercises, bodyPart, setBodyPart }) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [bodyParts, setBodyParts] = useState([]);
  const [error, setError] = useState('');
  const [isFallbackData, setIsFallbackData] = useState(false);

  useEffect(() => {
    const fetchExercisesData = async () => {
      try {
        const { data: bodyPartsData, isFallback } = await fetchDataWithStatus('https://exercisedb.p.rapidapi.com/exercises/bodyPartList', exerciseOptions);
        setBodyParts(['all', ...bodyPartsData]);
        setIsFallbackData(isFallback);
      } catch (fetchError) {
        setError('Unable to load body part filters.');
      }
    };

    fetchExercisesData();
  }, []);

  const handleSearch = async () => {
    const searchTerm = search.trim();

    if (!searchTerm) {
      // Clearing the box restores the current body-part list instead of leaving stale results.
      const listUrl = bodyPart === 'all'
        ? 'https://exercisedb.p.rapidapi.com/exercises'
        : `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${bodyPart}`;
      const { data: defaultExercises, isFallback: defaultIsFallback } = await fetchDataWithStatus(listUrl, exerciseOptions);

      setIsFallbackData(defaultIsFallback);
      setExercises(defaultExercises);
      return;
    }

    const { data: exercisesData, isFallback } = await fetchDataWithStatus('https://exercisedb.p.rapidapi.com/exercises', exerciseOptions);
    setIsFallbackData(isFallback);

    const searchedExercises = exercisesData.filter(
      (item) => item.name.toLowerCase().includes(searchTerm)
             || item.target.toLowerCase().includes(searchTerm)
             || item.equipment.toLowerCase().includes(searchTerm)
             || item.bodyPart.toLowerCase().includes(searchTerm),
    );

    window.scrollTo({ top: 1800, left: 100, behavior: 'smooth' });

    setSearch('');
    setExercises(searchedExercises);
  };

  return (
    <Stack alignItems="center" mt="37px" justifyContent="center" p="20px">
      {isFallbackData ? (
        <Alert severity="info" sx={{ mb: 3, width: '100%', maxWidth: '1170px', borderRadius: 3 }}>
          {FALLBACK_EXERCISE_MESSAGE}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="warning" sx={{ mb: 3, width: '100%', maxWidth: '1170px', borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Typography fontWeight={700} sx={{ fontSize: { lg: '44px', xs: '30px' } }} mb="20px" textAlign="center">
        Browse Exercises for Your Training Plan
      </Typography>
      <Typography color="text.secondary" maxWidth="820px" textAlign="center" mb="40px">
        Keep the public-facing exercise explorer as a lead magnet while your logged-in members use the new dashboard
        behind the scenes.
      </Typography>
      <Box position="relative" mb="72px">
        <TextField
          height="76px"
          sx={{
            input: { fontWeight: '700', border: 'none', borderRadius: '4px' },
            width: { lg: '1170px', xs: '350px' },
            backgroundColor: theme.palette.background.paper,
            borderRadius: '40px',
          }}
          value={search}
          onChange={(event) => setSearch(event.target.value.toLowerCase())}
          placeholder="Search exercises"
          type="text"
        />
        <Button
          className="search-btn"
          sx={{
            bgcolor: '#FF2625',
            color: '#fff',
            textTransform: 'none',
            width: { lg: '173px', xs: '96px' },
            height: '56px',
            position: 'absolute',
            right: '0',
            top: '10px',
            fontSize: { lg: '20px', xs: '14px' },
            borderRadius: '999px',
          }}
          onClick={handleSearch}
        >
          Search
        </Button>
      </Box>
      <Box sx={{ position: 'relative', width: '100%', p: '20px' }}>
        <HorizontalScrollbar data={bodyParts} bodyParts setBodyPart={setBodyPart} bodyPart={bodyPart} />
      </Box>
    </Stack>
  );
};

export default SearchExercises;
