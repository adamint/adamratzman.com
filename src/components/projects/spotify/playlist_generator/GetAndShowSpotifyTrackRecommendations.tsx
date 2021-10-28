import useDeepCompareEffect from 'use-deep-compare-effect';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useState } from 'react';
import { useData } from '../../../utils/useData';
import { SelectedObjects, SelectedTrackAttribute } from '../../../../pages/projects/spotify/recommend';
import { useRouter } from 'next/router';
import axios, { AxiosResponse } from 'axios';
import { GetRecommendationsRequestBody } from '../../../../pages/api/spotify/getRecommendations';
import { useNoShowBeforeRender } from '../../../utils/useNoShowBeforeRender';
import {
  Accordion,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Heading,
  Link,
  Spinner,
} from '@chakra-ui/react';
import { SpotifyTrack } from '../views/SpotifyTrack';
import { SeedView } from './SeedView';

interface RecommendationReturn {
  tracks: SpotifyApi.TrackObjectFull[];
  seeds: SpotifyApi.RecommendationsSeedObject[];
}

async function getRecommendations(options: any): Promise<RecommendationReturn | null> {
  if (!options) return null;
  const recommendationsResponse = (await axios.post<GetRecommendationsRequestBody, AxiosResponse<SpotifyApi.RecommendationsFromSeedsResponse>>(
      '/api/spotify/getRecommendations',
      { options: options })
  ).data;

  return {
    tracks: recommendationsResponse.tracks as SpotifyApi.TrackObjectFull[],
    seeds: recommendationsResponse.seeds,
  };
}

const getRecommendationsFunctionDebounced = AwesomeDebouncePromise(
  getRecommendations,
  1000,
);

type GetAndShowSpotifyTrackRecommendationsProps = {
  selectedObjects: SelectedObjects;
  selectedTrackAttributes: SelectedTrackAttribute[];
}

export function GetAndShowSpotifyTrackRecommendations({
                                                        selectedObjects,
                                                        selectedTrackAttributes,
                                                      }: GetAndShowSpotifyTrackRecommendationsProps) {
  const router = useRouter();
  const shouldShow = useNoShowBeforeRender();
  const [options, setOptions] = useState<any | null>(null);
  const {
    loading,
    data,
    error,
  } = useData(getRecommendationsFunctionDebounced, [options], [options], true);

  useDeepCompareEffect(() => {
    const selectedObjectKeys = Object.keys(selectedObjects);
    const recommendationOptions: any = {
      seed_genres: selectedObjectKeys.filter(uri => uri.startsWith('spotify:genre:')).map(uri => uri.replace('spotify:genre:', '')),
      seed_artists: selectedObjectKeys.filter(uri => uri.startsWith('spotify:artist:')).map(uri => uri.replace('spotify:artist:', '')),
      seed_tracks: selectedObjectKeys.filter(uri => uri.startsWith('spotify:track:')).map(uri => uri.replace('spotify:track:', '')),
      limit: 50,
    };
    selectedTrackAttributes.forEach(selectedTrackAttribute => {
      recommendationOptions[`${selectedTrackAttribute.type}_${selectedTrackAttribute.id}`] = !selectedTrackAttribute.trackAttribute.valueMapper ? selectedTrackAttribute.value : selectedTrackAttribute.trackAttribute.valueMapper(selectedTrackAttribute.value);
    });
    setOptions(recommendationOptions);
  }, [selectedObjects, selectedTrackAttributes]);

  async function handleCreateYourPlaylistButtonClicked() {
    window.open(
      `/projects/spotify/recommend/create-playlist?trackIds=${data!.tracks.map(track => track.id).join(',')}`,
      '_blank',
    );
  }

  if (loading || !shouldShow) return <Box>Loading recommendations... <Spinner size='sm' /></Box>;
  else if (error || !data) return <Alert status='error'>
    <AlertIcon />
    <AlertTitle mr={2}>We were unable to get track recommendations.</AlertTitle>
    <AlertDescription>{error?.status_text ?? error?.response}</AlertDescription>
  </Alert>;
  else {
    const { tracks, seeds } = data;
    return <>
      <Box>
        <Box mb={5}>
          <Heading size='mdx'>Recommended tracks ({tracks.length})</Heading>
          <Link onClick={handleCreateYourPlaylistButtonClicked}>Create your playlist (requires Spotify login) →</Link>
          <Accordion allowToggle mt={2}>
            {seeds.map((seed, index) => <SeedView key={seed.id} index={index} seedSource={seed} />)}
          </Accordion>
        </Box>
        <Box>
          {tracks.map(track => <SpotifyTrack track={track as SpotifyApi.TrackObjectFull} openInNewTab mb={3}
                                             key={track.id} />)}
        </Box>
      </Box>
    </>;
  }
}
