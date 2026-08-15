import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { Field, FieldProps, Form, Formik } from 'formik';
import { PkceGuardedSpotifyWebApiJs } from '../../../../spotify-utils/auth/SpotifyAuthUtils';
import { UseDisclosureReturn } from '@chakra-ui/hooks';

type PlaylistCreationOptions = {
  name: string;
  public: boolean;
  collaborative: boolean;
  description?: string;
}

type CreateSpotifyPlaylistModalProps = {
  guardedSpotifyApi: PkceGuardedSpotifyWebApiJs;
  createPlaylistDisclosure: UseDisclosureReturn;
  spotifyUserId: string;
  recommendedTracks: SpotifyApi.TrackObjectFull[];
}

export function getSafeSpotifyPlaylistUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    const authority = /^https:\/\/([^/?#]*)/iu.exec(value.trim())?.[1];
    if (
      url.protocol !== 'https:'
      || url.origin !== 'https://open.spotify.com'
      || authority?.includes('@')
      || url.username
      || url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function CreateSpotifyPlaylistModal({
                                             guardedSpotifyApi,
                                             createPlaylistDisclosure,
                                             spotifyUserId,
                                             recommendedTracks,
                                           }: CreateSpotifyPlaylistModalProps) {
  const toast = useToast();

  function validatePlaylistName(value: string) {
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
        const playlistCreationOptions: PlaylistCreationOptions = {
          name: values.playlistName,
          public: values.playlistShouldBePublic,
          collaborative: values.playlistShouldBeCollaborative,
        };
        if (values.playlistDescription.length > 0) playlistCreationOptions['description'] = values.playlistDescription;

        try {
          const spotifyApi = await guardedSpotifyApi.getApi();
          const createdPlaylist = await spotifyApi.createPlaylist(spotifyUserId, playlistCreationOptions);
          await spotifyApi.addTracksToPlaylist(createdPlaylist.id, recommendedTracks.map(track => track.uri));
          const spotifyUrlForPlaylist = getSafeSpotifyPlaylistUrl(createdPlaylist.external_urls.spotify);
          createPlaylistDisclosure.onClose();
          toast({
            status: 'success',
            title: 'Successfully created playlist.',
            description: spotifyUrlForPlaylist
              ? 'Redirecting you now to Spotify...'
              : 'Your Spotify playlist is ready.',
          });

          if (spotifyUrlForPlaylist) {
            setTimeout(() => {
              window.open(spotifyUrlForPlaylist, '_blank', 'noopener,noreferrer');
            }, 2000);
          }

        } catch {
          toast({
            status: 'error',
            title: 'Failed to create playlist. Please reload the page and try again',
          });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {(props) => (
        <Form>
          <ModalContent>
            <ModalHeader>Create your new Spotify playlist</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Field name='playlistName' validate={validatePlaylistName}>
                {({ field, form }: FieldProps) => (
                  <FormControl isInvalid={!!(form.errors.playlistName && form.touched.playlistName)} mb={3}>
                    <FormLabel htmlFor='playlistName'>Playlist name</FormLabel>
                    <Input {...field} id='playlistName' placeholder='playlist name' />
                    <FormErrorMessage>{form.errors.playlistName?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistShouldBePublic'>
                {({ field, form }: FieldProps) => (
                  <FormControl isInvalid={!!(form.errors.playlistShouldBePublic && form.touched.playlistShouldBePublic)}
                               display='flex' mb={3}>
                    <FormLabel htmlFor='playlistShouldBePublic'>Should playlist be public?</FormLabel>
                    <Switch {...field} isChecked={props.values.playlistShouldBePublic}
                            onChange={() => {
                              const newPublic = !props.values.playlistShouldBePublic;
                              props.setFieldValue('playlistShouldBePublic', newPublic);
                              if (newPublic) props.setFieldValue('playlistShouldBeCollaborative', false);
                            }}
                            id='playlistShouldBePublic'
                            mt={1} />
                    <FormErrorMessage>{form.errors.playlistShouldBePublic?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistShouldBeCollaborative'>
                {({ field, form }: FieldProps) => (
                  <FormControl
                    isInvalid={!!(form.errors.playlistShouldBeCollaborative && form.touched.playlistShouldBeCollaborative)}
                    display='flex' mb={3}>
                    <FormLabel htmlFor='playlistShouldBeCollaborative'>Should playlist be collaborative?</FormLabel>
                    <Switch {...field} isChecked={props.values.playlistShouldBeCollaborative}
                            onChange={() => {
                              const newCollaborative = !props.values.playlistShouldBeCollaborative;
                              props.setFieldValue('playlistShouldBeCollaborative', newCollaborative);
                              if (newCollaborative) props.setFieldValue('playlistShouldBePublic', false);
                            }}
                            id='playlistShouldBeCollaborative'
                            mt={1} />
                    <FormErrorMessage>{form.errors.playlistShouldBeCollaborative?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>

              <Field name='playlistDescription'>
                {({ field, form }: FieldProps) => (
                  <FormControl isInvalid={!!(form.errors.playlistDescription && form.touched.playlistDescription)}
                               mb={3}>
                    <FormLabel htmlFor='playlistDescription'>Playlist description</FormLabel>
                    <Textarea {...field} id='playlistDescription' placeholder='Enter playlist description (optional)' />
                    <FormErrorMessage>{form.errors.playlistDescription?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>
            </ModalBody>
            <ModalFooter>
              <Button variant='ghost' mr={3} onClick={createPlaylistDisclosure.onClose}>Close</Button>
              <Button colorScheme='blue' type='submit' isDisabled={props.isSubmitting}
                      isLoading={props.isSubmitting}>Create Playlist</Button>
            </ModalFooter>
          </ModalContent>
        </Form>
      )}
    </Formik>
  </Modal>;
}