import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { z } from 'zod';
import { isSpotifyTrackId } from '../../../../api/spotifyBrowserValidation';

type PlaylistCreationOptions = {
  name: string;
  public: boolean;
  collaborative: boolean;
  description?: string;
}

type PlaylistFormValues = {
  playlistName: string;
  playlistShouldBePublic: boolean;
  playlistShouldBeCollaborative: boolean;
  playlistDescription: string;
}

type PendingPlaylist = {
  playlistId: string;
  spotifyUrl?: string;
  spotifyUserId: string;
  trackUris: string[];
  formValues: PlaylistFormValues;
}

type CreateSpotifyPlaylistModalProps = {
  guardedSpotifyApi: PkceGuardedSpotifyWebApiJs;
  createPlaylistDisclosure: UseDisclosureReturn;
  spotifyUserId: string;
  recommendedTracks: SpotifyApi.TrackObjectFull[];
}

export const spotifyPendingPlaylistStorageKey = 'spotify_pending_playlist';

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

const playlistFormValuesSchema = z.object({
  playlistDescription: z.string().max(10_000),
  playlistName: z.string().min(1).max(1_000),
  playlistShouldBeCollaborative: z.boolean(),
  playlistShouldBePublic: z.boolean(),
}).strict().refine(values => !(
  values.playlistShouldBeCollaborative
  && values.playlistShouldBePublic
));

const pendingPlaylistSchema = z.object({
  formValues: playlistFormValuesSchema,
  playlistId: z.string().regex(/^[A-Za-z0-9]{1,64}$/u),
  spotifyUrl: z.string()
    .max(2_048)
    .refine(value => getSafeSpotifyPlaylistUrl(value) === value)
    .optional(),
  spotifyUserId: z.string().min(1).max(256),
  trackUris: z.array(
    z.string().refine(isSpotifyTrackUri),
  ).min(1).max(50),
}).strict();

function isSpotifyTrackUri(value: string) {
  const match = /^spotify:track:([^:]+)$/u.exec(value);
  return match !== null && isSpotifyTrackId(match[1]);
}

function createDefaultPlaylistFormValues(): PlaylistFormValues {
  return {
    playlistDescription: '',
    playlistName: '',
    playlistShouldBeCollaborative: false,
    playlistShouldBePublic: true,
  };
}

function pendingPlaylistMatches(
  pendingPlaylist: PendingPlaylist,
  spotifyUserId: string,
  trackUris: string[],
) {
  return pendingPlaylist.spotifyUserId === spotifyUserId
    && pendingPlaylist.trackUris.length === trackUris.length
    && pendingPlaylist.trackUris.every((uri, index) => uri === trackUris[index]);
}

function loadPendingPlaylist(
  spotifyUserId: string,
  trackUris: string[],
): PendingPlaylist | null {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.sessionStorage.getItem(
      spotifyPendingPlaylistStorageKey,
    );
    if (!storedValue) return null;

    const parsed = pendingPlaylistSchema.safeParse(JSON.parse(storedValue));
    if (
      parsed.success
      && pendingPlaylistMatches(parsed.data, spotifyUserId, trackUris)
    ) {
      return parsed.data;
    }
  } catch {
    // Invalid or unavailable session storage is handled as no recovery state.
  }

  clearPendingPlaylistStorage();
  return null;
}

function createPendingPlaylist(
  playlist: SpotifyApi.CreatePlaylistResponse,
  spotifyUserId: string,
  trackUris: string[],
  formValues: PlaylistFormValues,
): PendingPlaylist | null {
  const spotifyUrl = getSafeSpotifyPlaylistUrl(
    playlist.external_urls.spotify,
  );
  const parsed = pendingPlaylistSchema.safeParse({
    formValues,
    playlistId: playlist.id,
    ...(spotifyUrl ? { spotifyUrl } : {}),
    spotifyUserId,
    trackUris,
  });
  return parsed.success ? parsed.data : null;
}

function storePendingPlaylist(pendingPlaylist: PendingPlaylist) {
  try {
    window.sessionStorage.setItem(
      spotifyPendingPlaylistStorageKey,
      JSON.stringify(pendingPlaylist),
    );
  } catch {
    // The in-memory recovery state still supports retry in this modal session.
  }
}

function clearPendingPlaylistStorage() {
  try {
    window.sessionStorage.removeItem(spotifyPendingPlaylistStorageKey);
  } catch {
    // Storage cleanup failures must not break modal recovery.
  }
}

export function CreateSpotifyPlaylistModal({
                                             guardedSpotifyApi,
                                             createPlaylistDisclosure,
                                             spotifyUserId,
                                             recommendedTracks,
                                           }: CreateSpotifyPlaylistModalProps) {
  const toast = useToast();
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const trackUris = useMemo(
    () => recommendedTracks.map(track => track.uri),
    [recommendedTracks],
  );
  const [pendingPlaylist, setPendingPlaylist] = useState(
    () => loadPendingPlaylist(spotifyUserId, trackUris),
  );
  const activePendingPlaylist = pendingPlaylist
    && pendingPlaylistMatches(pendingPlaylist, spotifyUserId, trackUris)
    ? pendingPlaylist
    : null;

  useEffect(() => {
    setPendingPlaylist(loadPendingPlaylist(spotifyUserId, trackUris));
  }, [spotifyUserId, trackUris]);

  function validatePlaylistName(value: string) {
    return (value.length === 0) ? 'Playlist name cannot be empty' : null;
  }

  function closeModal() {
    createPlaylistDisclosure.onClose();
  }

  return <Modal blockScrollOnMount={false}
                closeOnEsc={!submitting}
                closeOnOverlayClick={!submitting}
                isOpen={createPlaylistDisclosure.isOpen}
                onClose={() => {
                  if (!submitting) closeModal();
                }}>
    <ModalOverlay />
    <Formik
      enableReinitialize
      initialValues={activePendingPlaylist?.formValues
        ?? createDefaultPlaylistFormValues()}
      onSubmit={async (values, actions) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        let pendingPlaylistForAttempt = activePendingPlaylist;
        const playlistCreationOptions: PlaylistCreationOptions = {
          name: values.playlistName,
          public: values.playlistShouldBePublic,
          collaborative: values.playlistShouldBeCollaborative,
        };
        if (values.playlistDescription.length > 0) playlistCreationOptions['description'] = values.playlistDescription;

        try {
          const spotifyApi = await guardedSpotifyApi.getApi();
          if (!pendingPlaylistForAttempt) {
            const playlist = await spotifyApi.createPlaylist(
              spotifyUserId,
              playlistCreationOptions,
            );
            pendingPlaylistForAttempt = createPendingPlaylist(
              playlist,
              spotifyUserId,
              trackUris,
              values,
            );
            if (!pendingPlaylistForAttempt) throw new Error();
            storePendingPlaylist(pendingPlaylistForAttempt);
            setPendingPlaylist(pendingPlaylistForAttempt);
          }

          await spotifyApi.replaceTracksInPlaylist(
            pendingPlaylistForAttempt.playlistId,
            pendingPlaylistForAttempt.trackUris,
          );
          const spotifyUrlForPlaylist = pendingPlaylistForAttempt.spotifyUrl;
          clearPendingPlaylistStorage();
          setPendingPlaylist(null);
          actions.resetForm({
            values: createDefaultPlaylistFormValues(),
          });
          if (spotifyUrlForPlaylist) {
            try {
              window.open(
                spotifyUrlForPlaylist,
                '_blank',
                'noopener,noreferrer',
              );
            } catch {
              // The persistent toast link remains available if opening a tab fails.
            }
          }
          closeModal();
          toast({
            duration: null,
            isClosable: true,
            status: 'success',
            title: 'Successfully created playlist.',
            description: spotifyUrlForPlaylist
              ? <>Your Spotify playlist is ready. <ChakraRouterLink
                href={spotifyUrlForPlaylist}
                target='_blank'
              >
                Open playlist on Spotify
              </ChakraRouterLink></>
              : 'Your Spotify playlist is ready.',
          });

        } catch {
          if (!pendingPlaylistForAttempt) {
            toast({
              status: 'error',
              title: 'Failed to create playlist. Please reload the page and try again',
            });
          }
        } finally {
          submittingRef.current = false;
          setSubmitting(false);
          actions.setSubmitting(false);
        }
      }}
    >
      {(props) => (
        <Form>
          <ModalContent>
            <ModalHeader>Create your new Spotify playlist</ModalHeader>
            <ModalCloseButton isDisabled={submitting} />
            <ModalBody>
              {activePendingPlaylist && !submitting && <Alert status='warning' mb={4} alignItems='start'>
                <AlertIcon mt={1} />
                <Box>
                  <AlertTitle>Your playlist was created, but its tracks are not confirmed.</AlertTitle>
                  <AlertDescription>
                    We couldn&apos;t add or confirm the recommended tracks. Retry below. Playlist details are locked
                    because this playlist already exists.
                  </AlertDescription>
                </Box>
              </Alert>}
              <Field name='playlistName' validate={validatePlaylistName}>
                {({ field, form }: FieldProps) => (
                  <FormControl isInvalid={!!(form.errors.playlistName && form.touched.playlistName)} mb={3}>
                    <FormLabel htmlFor='playlistName'>Playlist name</FormLabel>
                    <Input {...field} id='playlistName' isDisabled={!!activePendingPlaylist}
                           placeholder='playlist name' />
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
                            isDisabled={!!activePendingPlaylist}
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
                            isDisabled={!!activePendingPlaylist}
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
                    <Textarea {...field} id='playlistDescription' isDisabled={!!activePendingPlaylist}
                              placeholder='Enter playlist description (optional)' />
                    <FormErrorMessage>{form.errors.playlistDescription?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>
            </ModalBody>
            <ModalFooter>
              {activePendingPlaylist && <Button colorScheme='red' variant='outline' mr={3}
                                                isDisabled={submitting} type='button'
                                                onClick={() => {
                                                  clearPendingPlaylistStorage();
                                                  setPendingPlaylist(null);
                                                  props.resetForm({
                                                    values: createDefaultPlaylistFormValues(),
                                                  });
                                                  closeModal();
                                                }}>
                Abandon playlist recovery
              </Button>}
              <Button variant='ghost' mr={3} isDisabled={submitting}
                      onClick={closeModal} type='button'>Close</Button>
              <Button colorScheme='blue' type='submit' isDisabled={props.isSubmitting}
                      isLoading={props.isSubmitting}>
                {activePendingPlaylist ? 'Retry adding tracks' : 'Create Playlist'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Form>
      )}
    </Formik>
  </Modal>;
}