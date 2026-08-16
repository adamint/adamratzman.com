import React from 'react';
import { Box, HStack, Select, Slider, SliderFilledTrack, SliderThumb, SliderTrack } from '@chakra-ui/react';
import { TrackAttributeType } from '../TrackAttribute';
import { SelectedTrackAttribute } from '../../../../routes/projects/spotify/recommend';

type SetTrackAttributeValueAndTypeComponentProps = {
  selectedAttribute: SelectedTrackAttribute;
  selectedTrackAttributes: SelectedTrackAttribute[];
  setSelectedTrackAttributes: (attributes: SelectedTrackAttribute[]) => void;
}

export function SetTrackAttributeValueAndTypeComponent({
                                                         selectedAttribute,
                                                         selectedTrackAttributes,
                                                         setSelectedTrackAttributes,
                                                       }: SetTrackAttributeValueAndTypeComponentProps) {
  const { trackAttribute, value, type } = selectedAttribute;
  const modeSelectId = `spotify-track-attribute-${trackAttribute.id}-mode`;

  function handleAttributeValueChanged(newValue: number) {
    setSelectedTrackAttributes(selectedTrackAttributes.map(attribute => (
      attribute.id === selectedAttribute.id
        ? { ...selectedAttribute, value: newValue }
        : attribute
    )));
  }

  function handleAttributeTypeChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextType = event.target.value as SelectedTrackAttribute['type'];
    setSelectedTrackAttributes(selectedTrackAttributes.map(attribute => (
      attribute.id === selectedAttribute.id
        ? { ...selectedAttribute, type: nextType }
        : attribute
    )));
  }

  return <Box as='fieldset' border={0} mb={4} minW={0} p={0}>
    <Box as='legend' fontWeight='semibold' mb={1}>
      {trackAttribute.name}
    </Box>
    <HStack mb={1}>
      <Select
        aria-label={`${trackAttribute.name} tuning mode`}
        id={modeSelectId}
        maxW='175px'
        onChange={handleAttributeTypeChanged}
        value={type}
      >
        <option value='target'>Target value</option>
        <option value='min'>Minimum value</option>
        <option value='max'>Maximum value</option>
      </Select>
    </HStack>
    <Slider aria-label={`${trackAttribute.name} value`}
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