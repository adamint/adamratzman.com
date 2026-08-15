import { useEffect, useMemo, useState } from 'react';
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
  Box,
  Heading,
  Spinner,
  VisuallyHidden,
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
  const requestKey = JSON.stringify(options);
  const hasSeeds = hasRecommendationSeeds(options);
  const debouncedOptions = useDebouncedRecommendationOptions(
    options,
    requestKey,
    hasSeeds,
  );
  const waitingForDebounce = hasSeeds
    && !hasRecommendationSeeds(debouncedOptions);
  const producer = useMemo(() => {
    if (!hasSeeds || !hasRecommendationSeeds(debouncedOptions)) return null;

    return async (signal: AbortSignal): Promise<SpotifyRecommendationsResponse> => {
      const request: GetRecommendationsRequest = { options: debouncedOptions };
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
    };
  }, [debouncedOptions, hasSeeds]);
  const { loading, data, error } = useLatestAsyncData(producer, {
    keepPreviousData: true,
  });
  const isLoadingRecommendations = !shouldShow || waitingForDebounce || loading;

  if (!hasSeeds) return null;
  if (error || (!isLoadingRecommendations && !data)) return <Alert role='alert' status='error'>
    <AlertIcon />
    <AlertDescription>
      We were unable to load Spotify recommendations. Please try again.
    </AlertDescription>
  </Alert>;
  else {
    const tracks = data?.tracks ?? [];
    const seeds = data?.seeds ?? [];
    const searchParams = new URLSearchParams();
    tracks.forEach(track => searchParams.append('trackIds', track.id));
    const playlistPath = '/projects/spotify/recommend/create-playlist';
    const playlistUrl = tracks.length > 0
      ? `${playlistPath}?${searchParams.toString()}`
      : playlistPath;

    return <Box>
      <VisuallyHidden role='status' aria-live='polite' aria-atomic='true'>
        {isLoadingRecommendations
          ? 'Loading recommendations...'
          : `${tracks.length} Spotify recommendations loaded.`}
      </VisuallyHidden>
      {isLoadingRecommendations && <Box
        aria-hidden='true'
        mb={data ? 3 : 0}
      >
        Loading recommendations... <Spinner aria-hidden='true' size='sm' />
      </Box>}
      {data && (
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
      )}
    </Box>;
  }
}

function useDebouncedRecommendationOptions(
  options: SpotifyRecommendationOptions,
  requestKey: string,
  enabled: boolean,
) {
  const [currentRequest, setCurrentRequest] = useState(() => ({
    options,
    requestKey,
  }));

  useEffect(() => {
    if (currentRequest.requestKey === requestKey) return;
    if (!enabled) {
      setCurrentRequest({ options, requestKey });
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentRequest({ options, requestKey });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [currentRequest.requestKey, enabled, options, requestKey]);

  return currentRequest.options;
}

function hasRecommendationSeeds(options: SpotifyRecommendationOptions) {
  return (options.seed_artists?.length ?? 0) > 0
    || (options.seed_genres?.length ?? 0) > 0
    || (options.seed_tracks?.length ?? 0) > 0;
}
