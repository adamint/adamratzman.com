import React from 'react';
import { Box, Heading, HStack, Select, Slider, SliderFilledTrack, SliderThumb, SliderTrack } from '@chakra-ui/react';
import { TrackAttributeType } from '../TrackAttribute';
import { SelectedTrackAttribute } from '../../../../pages/projects/spotify/recommend';

type SetTrackAttributeValueAndTypeComponentProps = {
  selectedAttribute: SelectedTrackAttribute;
  selectedTrackAttributes: SelectedTrackAttribute[];
  setSelectedTrackAttributes: Function;
}

export function SetTrackAttributeValueAndTypeComponent({
                                                         selectedAttribute,
                                                         selectedTrackAttributes,
                                                         setSelectedTrackAttributes,
                                                       }: SetTrackAttributeValueAndTypeComponentProps) {
  const attributesWithoutSelected = selectedTrackAttributes.filter(attr => attr.id !== selectedAttribute.id);
  const { trackAttribute, value, type } = selectedAttribute;

  function handleAttributeValueChanged(newValue: number) {
    setSelectedTrackAttributes([...attributesWithoutSelected, { ...selectedAttribute, value: newValue }]);
  }

  function handleAttributeTypeChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedTrackAttributes([...attributesWithoutSelected, { ...selectedAttribute, type: event.target.value }]);
  }

  return <Box mb={2}>
    <HStack mb={1}>
      <Heading size='sm' variant='light'>{trackAttribute.name}</Heading>
      <Select value={type} maxW='175px' onChange={handleAttributeTypeChanged}>
        <option value='target'>Target value</option>
        <option value='min'>Minimum value</option>
        <option value='max'>Maximum value</option>
      </Select>
    </HStack>
    <Slider aria-label={`slider-${trackAttribute.id}`}
            value={value} min={trackAttribute.min}
            max={trackAttribute.max}
            step={trackAttribute.type === TrackAttributeType.Integer ? 1 : 0.01}
            onChange={handleAttributeValueChanged}>
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <SliderThumb fontSize='sm' boxSize='40px'
                   color='black'>{value}</SliderThumb>
    </Slider>
  </Box>;
}