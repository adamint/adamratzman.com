import { TrackAttributeType, tuneableTrackAttributes } from './TrackAttribute';
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete';
import { Box, Heading, HStack, Select, Slider, SliderFilledTrack, SliderThumb, SliderTrack } from '@chakra-ui/react';
import { SelectedTrackAttribute } from './SpotifyPlaylistGeneratorRoute';
import React from 'react';
import { useColorModeColor } from '../../../../utils/useColorModeColor';

type SpotifyTrackAttributeSelectorComponentProps = {
  selectedTrackAttributes: SelectedTrackAttribute[];
  setSelectedTrackAttributes: Function;
}

export function SpotifyTrackAttributeSelectorComponent({
                                                         selectedTrackAttributes,
                                                         setSelectedTrackAttributes,
                                                       }: SpotifyTrackAttributeSelectorComponentProps) {
  function handleSelectedAttributesChanged(newSelectedAttributes: string[]) {
    const filteredNewSelectedAttributes = selectedTrackAttributes.filter((attribute: SelectedTrackAttribute) => newSelectedAttributes.includes(attribute.id));
    newSelectedAttributes.filter(newAttribute => !filteredNewSelectedAttributes.some((attr: SelectedTrackAttribute) => newAttribute === attr.id)).forEach(newAttributeToAdd => {
      const trackAttr = tuneableTrackAttributes.find(tuneableTrackAttribute => tuneableTrackAttribute.id === newAttributeToAdd);
      if (trackAttr) {
        const attributeWithValue: SelectedTrackAttribute = {
          id: trackAttr.id,
          value: trackAttr.defaultValue,
          trackAttribute: trackAttr,
          type: 'target',
        };
        filteredNewSelectedAttributes.push(attributeWithValue);
      }
    });

    setSelectedTrackAttributes(filteredNewSelectedAttributes);
  }

  return <Box mb={5}>
    <AutoComplete openOnFocus suggestWhenEmpty multiple onChange={handleSelectedAttributesChanged}>
      <AutoCompleteInput variant='filled' placeholder='Enter an attribute...'>
        {({ tags }) =>
          tags.map((tag, tid) => (
            <AutoCompleteTag
              key={tid}
              label={tag.label}
              onRemove={tag.onRemove}
            />
          ))
        }
      </AutoCompleteInput>
      <AutoCompleteList maxH='100%'>
        {tuneableTrackAttributes.map(trackAttribute => (
          <AutoCompleteItem
            key={`option-${trackAttribute.id}`}
            value={trackAttribute.id}>
            {trackAttribute.name}
          </AutoCompleteItem>
        ))}
      </AutoCompleteList>
    </AutoComplete>

    {selectedTrackAttributes.length > 0 && <Box mt={5}>
      <Heading size='md' variant='semiLight' mb={3}>Track attribute values</Heading>
      {selectedTrackAttributes.sort((attr1, attr2) => attr1.id.localeCompare(attr2.id))
        .map(selectedAttribute => <SetTrackAttributeValueAndTypeComponent key={selectedAttribute.id}
                                                                          selectedAttribute={selectedAttribute}
                                                                          selectedTrackAttributes={selectedTrackAttributes}
                                                                          setSelectedTrackAttributes={setSelectedTrackAttributes} />)}
    </Box>}
  </Box>;
}

type SetTrackAttributeValueAndTypeComponentProps = {
  selectedAttribute: SelectedTrackAttribute;
  selectedTrackAttributes: SelectedTrackAttribute[];
  setSelectedTrackAttributes: Function;
}

function SetTrackAttributeValueAndTypeComponent({
                                                  selectedAttribute,
                                                  selectedTrackAttributes,
                                                  setSelectedTrackAttributes,
                                                }: SetTrackAttributeValueAndTypeComponentProps) {
  const colorModeColor = useColorModeColor()
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
      <SliderThumb fontSize='sm' boxSize='40px' color={colorModeColor === "black" ? "white" : "black"}>{value}</SliderThumb>
    </Slider>
  </Box>;
}