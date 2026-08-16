import { tuneableTrackAttributes } from '../TrackAttribute';
import {
  Box,
  Checkbox,
  Heading,
  SimpleGrid,
} from '@chakra-ui/react';
import { SelectedTrackAttribute } from '../../../../routes/projects/spotify/recommend';
import React from 'react';
import { SetTrackAttributeValueAndTypeComponent } from './SetTrackAttributeValueAndTypeComponent';

type SpotifyTrackAttributeSelectorComponentProps = {
  selectedTrackAttributes: SelectedTrackAttribute[];
  setSelectedTrackAttributes: (attributes: SelectedTrackAttribute[]) => void;
}

export function SpotifyTrackAttributeSelectorComponent({
                                                         selectedTrackAttributes,
                                                         setSelectedTrackAttributes,
                                                       }: SpotifyTrackAttributeSelectorComponentProps) {
  function handleSelectedAttributeChanged(
    attributeId: SelectedTrackAttribute['id'],
    selected: boolean,
  ) {
    if (!selected) {
      setSelectedTrackAttributes(
        selectedTrackAttributes.filter(attribute => attribute.id !== attributeId),
      );
      return;
    }
    if (selectedTrackAttributes.some(attribute => attribute.id === attributeId)) {
      return;
    }

    const trackAttribute = tuneableTrackAttributes.find(
      attribute => attribute.id === attributeId,
    );
    if (!trackAttribute) return;
    setSelectedTrackAttributes([
      ...selectedTrackAttributes,
      {
        id: trackAttribute.id,
        trackAttribute,
        type: 'target',
        value: trackAttribute.defaultValue,
      },
    ]);
  }

  return <Box mb={5}>
    <Box as='fieldset' border={0} m={0} p={0}>
      <Box as='legend' fontWeight='semibold' mb={2}>
        Spotify track attributes
      </Box>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={2}>
        {tuneableTrackAttributes.map(trackAttribute => (
          <Checkbox
            isChecked={selectedTrackAttributes.some(
              attribute => attribute.id === trackAttribute.id,
            )}
            key={trackAttribute.id}
            onChange={event => handleSelectedAttributeChanged(
              trackAttribute.id,
              event.target.checked,
            )}
          >
            {trackAttribute.name}
          </Checkbox>
        ))}
      </SimpleGrid>
    </Box>

    {selectedTrackAttributes.length > 0 && <Box mt={5}>
      <Heading as='h3' size='md' variant='semiLight' mb={3}>Track attribute values</Heading>
      {[...selectedTrackAttributes].sort((attr1, attr2) => attr1.id.localeCompare(attr2.id))
        .map(selectedAttribute => <SetTrackAttributeValueAndTypeComponent key={selectedAttribute.id}
                                                                          selectedAttribute={selectedAttribute}
                                                                          selectedTrackAttributes={selectedTrackAttributes}
                                                                          setSelectedTrackAttributes={setSelectedTrackAttributes} />)}
    </Box>}
  </Box>;
}
