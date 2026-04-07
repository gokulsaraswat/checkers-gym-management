import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';

import { exerciseOptions, fetchData, isRapidApiConfigured } from '../utils/fetchData';
import HorizontalScrollbar from './HorizontalScrollbar';

const SearchExercises = ({ setExercises, bodyPart, setBodyPart }) => {
  const [search, setSearch] = useState('');
  const [bodyParts, setBodyParts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExercisesData = async () => {
      try {
        const bodyPartsData = await fetchData('https://exercisedb.p.rapidapi.com/exercises/bodyPartList', exerciseOptions);
        setBodyParts(['all', ...bodyPartsData]);
      } catch (fetchError) {
        setError('Unable to load body part filters.');
      }
    };

    fetchExercisesData();
  }, []);

  const handleSearch = async () => {
    if (search) {
      const exercisesData = await fetchData('https://exercisedb.p.rapidapi.com/exercises', exerciseOptions);

      const searchedExercises = exercisesData.filter(
        (item) => item.name.toLowerCase().includes(search)
               || item.target.toLowerCase().includes(search)
               || item.equipment.toLowerCase().includes(search)
               || item.bodyPart.toLowerCase().includes(search),
      );

      window.scrollTo({ top: 1800, left: 100, behavior: 'smooth' });

      setSearch('');
      setExercises(searchedExercises);
    }
  };

  return (
    <Stack alignItems="center" mt="37px" justifyContent="center" p="20px">
      {!isRapidApiConfigured ? (
        <Alert severity="info" sx={{ mb: 3, width: '100%', maxWidth: '1170px', borderRadius: 3 }}>
          The live exercise API is not connected, so search is using the built-in demo library.
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
            backgroundColor: '#fff',
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
