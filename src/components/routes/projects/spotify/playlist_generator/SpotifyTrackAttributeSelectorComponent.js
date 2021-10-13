import { tuneableTrackAttributes } from './TrackAttributes';
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete';
import { Box, Heading, HStack, Select, Slider, SliderFilledTrack, SliderThumb, SliderTrack } from '@chakra-ui/react';

export function SpotifyTrackAttributeSelectorComponent({ selectedTrackAttributes, setSelectedTrackAttributes }) {
  function handleSelectedAttributesChanged(newSelectedAttributes) {
    const filteredNewSelectedAttributes = selectedTrackAttributes.filter(attribute => newSelectedAttributes.includes(attribute.id));
    newSelectedAttributes.filter(newAttribute => !filteredNewSelectedAttributes.some(attr => newAttribute === attr.id)).forEach(newAttributeToAdd => {
      const trackAttribute = tuneableTrackAttributes.find(tuneableTrackAttribute => tuneableTrackAttribute.id === newAttributeToAdd);
      const attributeWithValue = {
        id: trackAttribute.id,
        value: trackAttribute.defaultValue,
        trackAttribute: trackAttribute,
        type: 'target',
      };

      filteredNewSelectedAttributes.push(attributeWithValue);
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

function SetTrackAttributeValueAndTypeComponent({
                                                  selectedAttribute,
                                                  selectedTrackAttributes,
                                                  setSelectedTrackAttributes,
                                                }) {
  const attributesWithoutSelected = selectedTrackAttributes.filter(attr => attr.id !== selectedAttribute.id);
  const { trackAttribute, value, type } = selectedAttribute;

  function handleAttributeValueChanged(newValue) {
    setSelectedTrackAttributes([...attributesWithoutSelected, { ...selectedAttribute, value: newValue }]);
  }

  function handleAttributeTypeChanged(event) {
    setSelectedTrackAttributes([...attributesWithoutSelected, { ...selectedAttribute, type: event.target.value }]);
  }

  return <Box mb={2}>
    <HStack mb={1}>
      <Heading size='sm' variant='light'>{trackAttribute.name}</Heading>
      <Select value={type} maxW="175px" onChange={handleAttributeTypeChanged}>
        <option value="target">Target value</option>
        <option value="min">Minimum value</option>
        <option value="max">Maximum value</option>
      </Select>
    </HStack>
    <Slider aria-label={`slider-${trackAttribute.id}`}
            value={value} min={trackAttribute.min}
            max={trackAttribute.max}
            step={trackAttribute.type === 'Integer' ? 1 : 0.01}
            onChange={handleAttributeValueChanged}>
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <SliderThumb fontSize='sm' boxSize='40px'>{value}</SliderThumb>
    </Slider>
  </Box>;
}