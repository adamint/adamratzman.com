import useDeepCompareEffect from 'use-deep-compare-effect';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import { useState } from 'react';
import { useData } from '../../../../utils/useData';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Switch,
  Textarea,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { SpotifyTrack } from '../SpotifyTrack';
import ReactJson from 'react-json-view';
import { Field, Form, Formik } from 'formik';

async function getRecommendations(spotifyApi, options) {
  if (!options) return null;
  return await spotifyApi.getRecommendations(options);
}

const getRecommendationsFunctionDebounced = AwesomeDebouncePromise(
  getRecommendations,
  1000,
);

export function GetAndShowSpotifyTrackRecommendations({
                                                        spotifyApi,
                                                        selectedObjects,
                                                        selectedTrackAttributes,
                                                      }) {
  const [options, setOptions] = useState(null);
  const [spotifyUserId, setSpotifyUserId] = useState(null);
  const { loading, data, error } = useData(getRecommendationsFunctionDebounced, [options], [spotifyApi, options], true);
  const createPlaylistDisclosure = useDisclosure();

  useDeepCompareEffect(() => {
    const selectedObjectKeys = Object.keys(selectedObjects);
    const recommendationOptions = {
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
    const userId = (await spotifyApi.getMe()).id;
    setSpotifyUserId(userId);
    createPlaylistDisclosure.onOpen();
  }

  if (loading) return <Box>Loading recommendations... <Spinner size='sm' /></Box>;
  else if (error) return <Alert status='error'>
    <AlertIcon />
    <AlertTitle mr={2}>We were unable to get track recommendations.</AlertTitle>
    <AlertDescription>{error.status_text ?? error.response}</AlertDescription>
  </Alert>;
  else {
    const { tracks, seeds } = data;
    return <>
      <Box>
        <Box mb={5}>
          <Heading size='mdx'>Recommended tracks ({tracks.length})</Heading>
          <Link onClick={handleCreateYourPlaylistButtonClicked}>Create your playlist →</Link>
          <Accordion allowToggle mt={2}>
            {seeds.map((seed, index) => <AccordionItem key={seed.id}>
                <h2>
                  <AccordionButton>
                    <Box flex='1' textAlign='left'>
                      Seed {index + 1}
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <ReactJson src={seed} name={null} />
                </AccordionPanel>
              </AccordionItem>,
            )}
          </Accordion>
        </Box>
        <Box>
          {tracks.map(track => <SpotifyTrack track={track} openInNewTab mb={3} key={track.id} />)}
        </Box>
      </Box>

      <CreateSpotifyPlaylistModal spotifyApi={spotifyApi}
                                  createPlaylistDisclosure={createPlaylistDisclosure}
                                  spotifyUserId={spotifyUserId}
                                  recommendedTracks={tracks} />
    </>;
  }
}

function CreateSpotifyPlaylistModal({ spotifyApi, createPlaylistDisclosure, spotifyUserId, recommendedTracks }) {
  const toast = useToast();

  function validatePlaylistName(value) {
    return (value.length === 0) ? 'Playlist name cannot be empty' : null;
  }

  return <Modal blockScrollOnMount={false} isOpen={createPlaylistDisclosure.isOpen}
                onClose={createPlaylistDisclosure.onClose}>
    <ModalOverlay />
    <Formik
      initialValues={{
        playlistName: '',
        playlistShouldBePublic: true,
        playlistShouldBeCollaborative: false,
        playlistDescription: '',
      }}
      onSubmit={async (values, actions) => {
        const playlistCreationOptions = {
          name: values.playlistName,
          public: values.playlistShouldBePublic,
          collaborative: values.playlistShouldBeCollaborative,
        };
        if (values.playlistDescription.length > 0) playlistCreationOptions['description'] = values.playlistDescription;

        try {
          const createdPlaylist = await spotifyApi.createPlaylist(spotifyUserId, playlistCreationOptions);
          await spotifyApi.addTracksToPlaylist(createdPlaylist.id, recommendedTracks.map(track => track.uri));
          const spotifyUrlForPlaylist = createdPlaylist.external_urls.spotify;
          createPlaylistDisclosure.onClose();
          toast({
            status: 'success',
            title: 'Successfully created playlist.',
            description: "Redirecting you now to Spotify..."
          });

          setTimeout(() => {
            window.open(spotifyUrlForPlaylist, '_blank');
          }, 2000);

        } catch (e) {
          toast({
            status: 'error',
            title: 'Failed to create playlist. Please reload the page and try again',
            description: e.statusText ?? e.response
          });
        }
        actions.setSubmitting(false);
      }}
    >
      {(props) => (
        <Form>
          <ModalContent>
            <ModalHeader>Create your new Spotify playlist</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Field name='playlistName' validate={validatePlaylistName}>
                {({ field, form }) => (
                  <FormControl isInvalid={form.errors.playlistName && form.touched.playlistName} mb={3}>
                    <FormLabel htmlFor='playlistName'>Playlist name</FormLabel>
                    <Input {...field} id='playlistName' placeholder='playlist name' />
                    <FormErrorMessage>{form.errors.playlistName}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistShouldBePublic'>
                {({ field, form }) => (
                  <FormControl isInvalid={form.errors.playlistShouldBePublic && form.touched.playlistShouldBePublic}
                               display='flex' mb={3}>
                    <FormLabel htmlFor='playlistShouldBePublic'>Should playlist be public?</FormLabel>
                    <Switch {...field} isChecked={props.values.playlistShouldBePublic}
                            onChange={() => props.setFieldValue('playlistShouldBePublic', !props.values.playlistShouldBePublic)}
                            id='playlistShouldBePublic'
                            mt={1} />
                    <FormErrorMessage>{form.errors.playlistShouldBePublic}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistShouldBeCollaborative'>
                {({ field, form }) => (
                  <FormControl
                    isInvalid={form.errors.playlistShouldBeCollaborative && form.touched.playlistShouldBeCollaborative}
                    display='flex' mb={3}>
                    <FormLabel htmlFor='playlistShouldBeCollaborative'>Should playlist be collaborative?</FormLabel>
                    <Switch {...field} isChecked={props.values.playlistShouldBeCollaborative}
                            onChange={() => props.setFieldValue('playlistShouldBeCollaborative', !props.values.playlistShouldBeCollaborative)}
                            id='playlistShouldBeCollaborative'
                            mt={1} />
                    <FormErrorMessage>{form.errors.playlistShouldBeCollaborative}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistDescription'>
                {({ field, form }) => (
                  <FormControl isInvalid={form.errors.playlistDescription && form.touched.playlistDescription} mb={3}>
                    <FormLabel htmlFor='playlistDescription'>Playlist description</FormLabel>
                    <Textarea {...field} id='playlistDescription' placeholder='Enter playlist description (optional)' />
                    <FormErrorMessage>{form.errors.playlistDescription}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>
            </ModalBody>
            <ModalFooter>
              <Button variant='ghost' mr={3} onClick={createPlaylistDisclosure.onClose}>Close</Button>
              <Button colorScheme='blue' type='submit' isLoading={props.isSubmitting}>Create Playlist</Button>
            </ModalFooter>
          </ModalContent>
        </Form>
      )}
    </Formik>
  </Modal>;
}