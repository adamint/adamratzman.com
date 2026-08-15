import { Alert, AlertDescription, AlertIcon } from '@chakra-ui/react';
import { GetAndShowSpotifyTrackRecommendations } from './GetAndShowSpotifyTrackRecommendations';
import React from 'react';
import { SelectedObjects, SelectedTrackAttribute } from '../../../../pages/projects/spotify/recommend';

type SpotifyGenerateAndShowPlaylistRecommendationsComponentProps = {
  selectedObjects: SelectedObjects;
  selectedTrackAttributes: SelectedTrackAttribute[]
}

export function SpotifyGenerateAndShowPlaylistRecommendationsComponent({
                                                                         selectedObjects,
                                                                         selectedTrackAttributes,
                                                                       }: SpotifyGenerateAndShowPlaylistRecommendationsComponentProps) {
  if (Object.entries(selectedObjects).length === 0) {
    if (selectedTrackAttributes.length > 0) {
      return <Alert status='error' mt={10}>
        <AlertIcon />
        <AlertDescription>You need to add at least one artist, track, or genre.</AlertDescription>
      </Alert>;
    } else return null;
  } else if (Object.entries(selectedObjects).length > 5) {
    return <Alert status='error' mt={10}>
      <AlertIcon />
      <AlertDescription>You can only have between one and five artists, tracks, and genres.</AlertDescription>
    </Alert>;
  } else return <GetAndShowSpotifyTrackRecommendations selectedObjects={selectedObjects}
                                                       selectedTrackAttributes={selectedTrackAttributes} />;
}