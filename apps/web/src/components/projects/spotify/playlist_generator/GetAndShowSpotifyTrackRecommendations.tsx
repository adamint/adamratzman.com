import { useMemo } from 'react';
import type {
  GetRecommendationsRequest,
  SpotifyRecommendationOptions,
  SpotifyRecommendationsResponse,
  SpotifyRecommendationTuningKey,
} from '@adamratzman/contracts';
import type {
  SelectedObjects,
  SelectedTrackAttribute,
} from '../../../../routes/projects/spotify/recommend';
import { useNoShowBeforeRender } from '../../../utils/useNoShowBeforeRender';
import {
  Accordion,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Heading,
  Spinner,
} from '@chakra-ui/react';
import { SpotifyTrack } from '../views/SpotifyTrack';
import { SeedView } from './SeedView';
import { useLatestAsyncData } from '../../../utils/useLatestAsyncData';
import { fetchJson } from '../../../../api/client';
import { isSpotifyRecommendationsResponse } from '../../../../api/spotifyBrowserValidation';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';

type GetAndShowSpotifyTrackRecommendationsProps = {
  selectedObjects: SelectedObjects;
  selectedTrackAttributes: SelectedTrackAttribute[];
}

export function GetAndShowSpotifyTrackRecommendations({
                                                        selectedObjects,
                                                        selectedTrackAttributes,
                                                        }: GetAndShowSpotifyTrackRecommendationsProps) {
  const shouldShow = useNoShowBeforeRender();
  const options = useMemo<SpotifyRecommendationOptions>(() => {
    const selectedObjectKeys = Object.keys(selectedObjects);
    const recommendationOptions: SpotifyRecommendationOptions = {
      seed_genres: selectedObjectKeys.filter(uri => uri.startsWith('spotify:genre:')).map(uri => uri.replace('spotify:genre:', '')),
      seed_artists: selectedObjectKeys.filter(uri => uri.startsWith('spotify:artist:')).map(uri => uri.replace('spotify:artist:', '')),
      seed_tracks: selectedObjectKeys.filter(uri => uri.startsWith('spotify:track:')).map(uri => uri.replace('spotify:track:', '')),
      limit: 50,
    };
    selectedTrackAttributes.forEach(selectedTrackAttribute => {
      const key: SpotifyRecommendationTuningKey = `${selectedTrackAttribute.type}_${selectedTrackAttribute.id}`;
      recommendationOptions[key] = !selectedTrackAttribute.trackAttribute.valueMapper ? selectedTrackAttribute.value : selectedTrackAttribute.trackAttribute.valueMapper(selectedTrackAttribute.value);
    });

    return recommendationOptions;
  }, [selectedObjects, selectedTrackAttributes]);
  const producer = useMemo(() => (
    async (signal: AbortSignal): Promise<SpotifyRecommendationsResponse> => {
      const request: GetRecommendationsRequest = { options };
      const response = await fetchJson<unknown>(
        '/api/spotify/getRecommendations',
        {
          body: JSON.stringify(request),
          headers: {
            'content-type': 'application/json',
          },
          method: 'POST',
          signal,
        },
      );
      if (!isSpotifyRecommendationsResponse(response)) throw new Error();
      return response;
    }
  ), [options]);
  const { loading, data, error } = useLatestAsyncData(producer);

  if (loading || !shouldShow) return <Box>Loading recommendations... <Spinner size='sm' /></Box>;
  else if (error || !data) return <Alert status='error'>
    <AlertIcon />
    <AlertTitle mr={2}>We were unable to get track recommendations.</AlertTitle>
    <AlertDescription>Please try again.</AlertDescription>
  </Alert>;
  else {
    const { tracks, seeds } = data;
    const searchParams = new URLSearchParams();
    tracks.forEach(track => searchParams.append('trackIds', track.id));
    const playlistPath = '/projects/spotify/recommend/create-playlist';
    const playlistUrl = searchParams.size > 0
      ? `${playlistPath}?${searchParams.toString()}`
      : playlistPath;

    return <>
      <Box>
        <Box mb={5}>
          <Heading size='mdx'>Recommended tracks ({tracks.length})</Heading>
          <ChakraRouterLink
            href={playlistUrl}
            rel='noopener noreferrer'
            target='_blank'
          >
            Create your playlist (requires Spotify login) →
          </ChakraRouterLink>
          <Accordion allowToggle mt={2}>
            {seeds.map((seed, index) => <SeedView key={seed.id} index={index} seedSource={seed} />)}
          </Accordion>
        </Box>
        <Box>
          {tracks.map(track => <SpotifyTrack track={track} openInNewTab mb={3}
                                             key={track.id} />)}
        </Box>
      </Box>
    </>;
  }
}
