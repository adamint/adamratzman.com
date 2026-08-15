import { tuneableTrackAttributes } from '../TrackAttribute';
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete';
import { Box, Heading } from '@chakra-ui/react';
import { SelectedTrackAttribute } from '../../../../pages/projects/spotify/recommend';
import React from 'react';
import { SetTrackAttributeValueAndTypeComponent } from './SetTrackAttributeValueAndTypeComponent';

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

