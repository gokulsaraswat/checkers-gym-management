import React, { useEffect, useState } from 'react';
import Pagination from '@mui/material/Pagination';
import { Alert, Box, Stack, Typography } from '@mui/material';

import { exerciseOptions, FALLBACK_EXERCISE_MESSAGE, fetchDataWithStatus } from '../utils/fetchData';
import ExerciseCard from './ExerciseCard';
import Loader from './Loader';

const Exercises = ({ exercises, setExercises, bodyPart }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [exercisesPerPage] = useState(6);
  const [error, setError] = useState('');
  const [isFallbackData, setIsFallbackData] = useState(false);

  useEffect(() => {
    const fetchExercisesData = async () => {
      try {
        setError('');

        const url = bodyPart === 'all'
          ? 'https://exercisedb.p.rapidapi.com/exercises'
          : `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${bodyPart}`;

        const { data: exercisesData, isFallback } = await fetchDataWithStatus(url, exerciseOptions);

        setIsFallbackData(isFallback);
        setExercises(exercisesData);
      } catch (fetchError) {
        setError('Unable to load exercises right now.');
        setExercises([]);
      }
    };

    fetchExercisesData();
  }, [bodyPart, setExercises]);

  const indexOfLastExercise = currentPage * exercisesPerPage;
  const indexOfFirstExercise = indexOfLastExercise - exercisesPerPage;
  const currentExercises = exercises.slice(indexOfFirstExercise, indexOfLastExercise);

  const paginate = (_event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 1800, behavior: 'smooth' });
  };

  if (!currentExercises.length && !error) return <Loader />;

  return (
    <Box id="exercises" sx={{ mt: { lg: '109px' } }} mt="50px" p="20px">
      {isFallbackData ? (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
          {FALLBACK_EXERCISE_MESSAGE}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}

      <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { lg: '44px', xs: '30px' } }} mb="46px">
        Showing Results
      </Typography>

      <Stack direction="row" sx={{ gap: { lg: '60px', xs: '30px' } }} flexWrap="wrap" justifyContent="center">
        {currentExercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </Stack>

      <Stack sx={{ mt: { lg: '114px', xs: '70px' } }} alignItems="center">
        {exercises.length > exercisesPerPage && (
          <Pagination
            color="standard"
            shape="rounded"
            defaultPage={1}
            count={Math.ceil(exercises.length / exercisesPerPage)}
            page={currentPage}
            onChange={paginate}
            size="large"
          />
        )}
      </Stack>
    </Box>
  );
};

export default Exercises;
