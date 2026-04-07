import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box } from '@mui/material';

import { exerciseOptions, fetchData, youtubeOptions } from '../../../utils/fetchData';
import Detail from '../../../components/Detail';
import ExerciseVideos from '../../../components/ExerciseVideos';
import SimilarExercises from '../../../components/SimilarExercises';
import LoadingScreen from '../../../components/common/LoadingScreen';

const ExerciseDetailPage = () => {
  const [exerciseDetail, setExerciseDetail] = useState(null);
  const [exerciseVideos, setExerciseVideos] = useState(null);
  const [targetMuscleExercises, setTargetMuscleExercises] = useState(null);
  const [equipmentExercises, setEquipmentExercises] = useState(null);
  const [error, setError] = useState('');
  const { id } = useParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchExercisesData = async () => {
      try {
        setError('');

        const exerciseDbUrl = 'https://exercisedb.p.rapidapi.com';
        const youtubeSearchUrl = 'https://youtube-search-and-download.p.rapidapi.com';

        const exerciseDetailData = await fetchData(`${exerciseDbUrl}/exercises/exercise/${id}`, exerciseOptions);
        setExerciseDetail(exerciseDetailData);

        const exerciseVideosData = await fetchData(
          `${youtubeSearchUrl}/search?query=${exerciseDetailData.name} exercise`,
          youtubeOptions,
        );
        setExerciseVideos(exerciseVideosData.contents || []);

        const targetMuscleExercisesData = await fetchData(
          `${exerciseDbUrl}/exercises/target/${exerciseDetailData.target}`,
          exerciseOptions,
        );
        setTargetMuscleExercises(targetMuscleExercisesData || []);

        const equipmentExercisesData = await fetchData(
          `${exerciseDbUrl}/exercises/equipment/${exerciseDetailData.equipment}`,
          exerciseOptions,
        );
        setEquipmentExercises(equipmentExercisesData || []);
      } catch (fetchError) {
        setError('Unable to load this exercise right now.');
      }
    };

    fetchExercisesData();
  }, [id]);

  if (!exerciseDetail) {
    return <LoadingScreen message="Loading exercise details..." />;
  }

  return (
    <Box sx={{ mt: { lg: '96px', xs: '60px' } }}>
      {error ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      ) : null}
      <Detail exerciseDetail={exerciseDetail} />
      <ExerciseVideos exerciseVideos={exerciseVideos} name={exerciseDetail.name} />
      <SimilarExercises
        targetMuscleExercises={targetMuscleExercises}
        equipmentExercises={equipmentExercises}
      />
    </Box>
  );
};

export default ExerciseDetailPage;
