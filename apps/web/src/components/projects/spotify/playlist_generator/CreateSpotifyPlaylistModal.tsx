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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
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

type PlaylistRecoveryMarker<
  Kind extends 'completed' | 'unrecoverable' = 'completed' | 'unrecoverable',
> = {
  kind: Kind;
  spotifyUserId: string;
  trackUris: string[];
}

type PlaylistRecovery = PendingPlaylist
  | PlaylistRecoveryMarker<'unrecoverable'>
  | { kind: 'unrecoverable' };

type PendingPlaylistReadResult =
  | { kind: 'absent' }
  | { kind: 'completed' }
  | { kind: 'malformed' }
  | { kind: 'mismatched' }
  | { kind: 'pending'; pendingPlaylist: PendingPlaylist }
  | {
    kind: 'unrecoverable';
    marker: PlaylistRecoveryMarker<'unrecoverable'>;
  };

type CreateSpotifyPlaylistModalProps = {
  guardedSpotifyApi: PkceGuardedSpotifyWebApiJs;
  createPlaylistDisclosure: UseDisclosureReturn;
  finalFocusRef: RefObject<HTMLButtonElement>;
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

const playlistRecoveryMarkerSchema = z.object({
  kind: z.enum(['completed', 'unrecoverable']),
  spotifyUserId: z.string().min(1).max(256),
  trackUris: z.array(
    z.string().refine(isSpotifyTrackUri),
  ).min(1).max(50),
}).strict();

const storedPlaylistRecoverySchema = z.union([
  pendingPlaylistSchema,
  playlistRecoveryMarkerSchema,
]);

const volatilePlaylistRecovery = new Map<string, PendingPlaylist | PlaylistRecoveryMarker>();
const volatileRecoveryFallbackScopes = new Set<string>();

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
  pendingPlaylist: Pick<PendingPlaylist, 'spotifyUserId' | 'trackUris'>,
  spotifyUserId: string,
  trackUris: string[],
) {
  return pendingPlaylist.spotifyUserId === spotifyUserId
    && pendingPlaylist.trackUris.length === trackUris.length
    && pendingPlaylist.trackUris.every((uri, index) => uri === trackUris[index]);
}

function createPlaylistRecoveryScopeKey(
  spotifyUserId: string,
  trackUris: string[],
): string {
  return JSON.stringify([spotifyUserId, trackUris]);
}

function parsePendingPlaylistStorage(
  storedValue: string | null,
  spotifyUserId: string,
  trackUris: string[],
): PendingPlaylistReadResult {
  if (storedValue === null) return { kind: 'absent' };
  if (storedValue.trim().length === 0) return { kind: 'malformed' };

  try {
    const parsed = storedPlaylistRecoverySchema.safeParse(
      JSON.parse(storedValue),
    );
    if (!parsed.success) return { kind: 'malformed' };
    if (!pendingPlaylistMatches(parsed.data, spotifyUserId, trackUris)) {
      return { kind: 'mismatched' };
    }
    if ('kind' in parsed.data) {
      return parsed.data.kind === 'completed'
        ? { kind: 'completed' }
        : {
          kind: 'unrecoverable',
          marker: {
            kind: 'unrecoverable',
            spotifyUserId: parsed.data.spotifyUserId,
            trackUris: parsed.data.trackUris,
          },
        };
    }
    return { kind: 'pending', pendingPlaylist: parsed.data };
  } catch {
    return { kind: 'malformed' };
  }
}

function readPendingPlaylistStorage(
  spotifyUserId: string,
  trackUris: string[],
  scopeKey: string,
): PendingPlaylistReadResult {
  if (typeof window === 'undefined') return { kind: 'absent' };
  if (
    volatileRecoveryFallbackScopes.has(scopeKey)
    && volatilePlaylistRecovery.has(scopeKey)
  ) {
    return readVolatilePlaylistRecovery(scopeKey);
  }

  try {
    const storedValue = window.sessionStorage.getItem(
      spotifyPendingPlaylistStorageKey,
    );
    const parsed = parsePendingPlaylistStorage(
      storedValue,
      spotifyUserId,
      trackUris,
    );
    if (parsed.kind !== 'absent') return parsed;
    return parsed;
  } catch {
    return readVolatilePlaylistRecovery(scopeKey);
  }
}

function readVolatilePlaylistRecovery(
  scopeKey: string,
): PendingPlaylistReadResult {
  const volatileRecovery = volatilePlaylistRecovery.get(scopeKey);
  if (!volatileRecovery) return { kind: 'absent' };
  if ('kind' in volatileRecovery) {
    return volatileRecovery.kind === 'completed'
      ? { kind: 'completed' }
      : {
        kind: 'unrecoverable',
        marker: {
          kind: 'unrecoverable',
          spotifyUserId: volatileRecovery.spotifyUserId,
          trackUris: volatileRecovery.trackUris,
        },
      };
  }
  return { kind: 'pending', pendingPlaylist: volatileRecovery };
}

function createPendingPlaylist(
  playlist: unknown,
  spotifyUserId: string,
  trackUris: string[],
  formValues: PlaylistFormValues,
): PendingPlaylist | null {
  try {
    const response = playlist as SpotifyApi.CreatePlaylistResponse;
    const spotifyUrl = getSafeSpotifyPlaylistUrl(
      response.external_urls?.spotify,
    );
    const parsed = pendingPlaylistSchema.safeParse({
      formValues,
      playlistId: response.id,
      ...(spotifyUrl ? { spotifyUrl } : {}),
      spotifyUserId,
      trackUris,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function createPlaylistRecoveryMarker<
  Kind extends PlaylistRecoveryMarker['kind'],
>(
  kind: Kind,
  spotifyUserId: string,
  trackUris: string[],
): PlaylistRecoveryMarker<Kind> | null {
  const marker: PlaylistRecoveryMarker<Kind> = {
    kind,
    spotifyUserId,
    trackUris,
  };
  const parsed = playlistRecoveryMarkerSchema.safeParse({
    ...marker,
  });
  return parsed.success ? marker : null;
}

function storePlaylistRecovery(
  recovery: PendingPlaylist | PlaylistRecoveryMarker,
  scopeKey: string,
) {
  volatilePlaylistRecovery.set(scopeKey, recovery);
  try {
    window.sessionStorage.setItem(
      spotifyPendingPlaylistStorageKey,
      JSON.stringify(recovery),
    );
    volatileRecoveryFallbackScopes.delete(scopeKey);
  } catch {
    volatileRecoveryFallbackScopes.add(scopeKey);
    // Volatile recovery still blocks duplicate creation in this document.
  }
}

function removePendingPlaylistStorage(scopeKey: string) {
  try {
    window.sessionStorage.removeItem(spotifyPendingPlaylistStorageKey);
    volatilePlaylistRecovery.delete(scopeKey);
    volatileRecoveryFallbackScopes.delete(scopeKey);
  } catch {
    volatileRecoveryFallbackScopes.add(scopeKey);
    // A safe marker or volatile recovery remains authoritative.
  }
}

function completePlaylistRecovery(
  spotifyUserId: string,
  trackUris: string[],
  scopeKey: string,
) {
  const completedMarker = createPlaylistRecoveryMarker(
    'completed',
    spotifyUserId,
    trackUris,
  );
  if (completedMarker) storePlaylistRecovery(completedMarker, scopeKey);
  removePendingPlaylistStorage(scopeKey);
}

export function CreateSpotifyPlaylistModal({
                                             guardedSpotifyApi,
                                             createPlaylistDisclosure,
                                             finalFocusRef,
                                             spotifyUserId,
                                             recommendedTracks,
                                           }: CreateSpotifyPlaylistModalProps) {
  const toast = useToast();
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);
  const disclosureOpenRef = useRef(createPlaylistDisclosure.isOpen);
  disclosureOpenRef.current = createPlaylistDisclosure.isOpen;
  const [submitting, setSubmitting] = useState(false);
  const trackUris = useMemo(
    () => recommendedTracks.map(track => track.uri),
    [recommendedTracks],
  );
  const recoveryScopeKey = useMemo(
    () => createPlaylistRecoveryScopeKey(spotifyUserId, trackUris),
    [spotifyUserId, trackUris],
  );
  const [hydratedRecovery, setHydratedRecovery] = useState<{
    recovery: PlaylistRecovery | null;
    scopeKey: string;
  } | null>(null);
  const recoveryHydrated = hydratedRecovery?.scopeKey === recoveryScopeKey;
  const recovery = recoveryHydrated ? hydratedRecovery.recovery : null;
  const activePendingPlaylist = recovery && !('kind' in recovery)
    ? recovery
    : null;
  const unrecoverablePlaylist = recovery !== null
    && 'kind' in recovery
    && recovery.kind === 'unrecoverable';
  const formLocked = !recoveryHydrated
    || activePendingPlaylist !== null
    || unrecoverablePlaylist;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const readResult = readPendingPlaylistStorage(
      spotifyUserId,
      trackUris,
      recoveryScopeKey,
    );

    if (readResult.kind === 'malformed' || readResult.kind === 'mismatched') {
      volatilePlaylistRecovery.delete(recoveryScopeKey);
      removePendingPlaylistStorage(recoveryScopeKey);
    } else if (readResult.kind === 'completed') {
      removePendingPlaylistStorage(recoveryScopeKey);
    }

    const nextRecovery = readResult.kind === 'pending'
      ? readResult.pendingPlaylist
      : readResult.kind === 'unrecoverable'
        ? readResult.marker
        : null;
    if (mountedRef.current) {
      setHydratedRecovery({
        recovery: nextRecovery,
        scopeKey: recoveryScopeKey,
      });
    }
  }, [recoveryScopeKey, spotifyUserId, trackUris]);

  function validatePlaylistName(value: string) {
    return (value.length === 0) ? 'Playlist name cannot be empty' : null;
  }

  function closeModal() {
    disclosureOpenRef.current = false;
    createPlaylistDisclosure.onClose();
  }

  return <Modal blockScrollOnMount={false}
                closeOnEsc
                closeOnOverlayClick
                finalFocusRef={finalFocusRef}
                isOpen={createPlaylistDisclosure.isOpen}
                onClose={closeModal}>
    <ModalOverlay />
    <Formik
      enableReinitialize
      initialValues={activePendingPlaylist?.formValues
        ?? createDefaultPlaylistFormValues()}
      onSubmit={async (values, actions) => {
        if (
          !recoveryHydrated
          || unrecoverablePlaylist
          || submittingRef.current
        ) {
          if (mountedRef.current) actions.setSubmitting(false);
          return;
        }
        submittingRef.current = true;
        if (mountedRef.current) setSubmitting(true);
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
            if (!pendingPlaylistForAttempt) {
              const unrecoverableMarker = createPlaylistRecoveryMarker(
                'unrecoverable',
                spotifyUserId,
                trackUris,
              );
              if (unrecoverableMarker) {
                storePlaylistRecovery(
                  unrecoverableMarker,
                  recoveryScopeKey,
                );
              }
              if (mountedRef.current) {
                setHydratedRecovery({
                  recovery: unrecoverableMarker ?? { kind: 'unrecoverable' },
                  scopeKey: recoveryScopeKey,
                });
              }
              return;
            }
            storePlaylistRecovery(
              pendingPlaylistForAttempt,
              recoveryScopeKey,
            );
            if (mountedRef.current) {
              setHydratedRecovery({
                recovery: pendingPlaylistForAttempt,
                scopeKey: recoveryScopeKey,
              });
            }
          }

          await spotifyApi.replaceTracksInPlaylist(
            pendingPlaylistForAttempt.playlistId,
            pendingPlaylistForAttempt.trackUris,
          );
          const spotifyUrlForPlaylist = pendingPlaylistForAttempt.spotifyUrl;
          completePlaylistRecovery(
            spotifyUserId,
            trackUris,
            recoveryScopeKey,
          );
          if (mountedRef.current) {
            setHydratedRecovery({
              recovery: null,
              scopeKey: recoveryScopeKey,
            });
            actions.resetForm({
              values: createDefaultPlaylistFormValues(),
            });
          }
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
          if (mountedRef.current && disclosureOpenRef.current) closeModal();
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
          if (mountedRef.current) {
            setSubmitting(false);
            actions.setSubmitting(false);
          }
        }
      }}
    >
      {(props) => (
        <Form>
          <ModalContent>
            <ModalHeader>Create your new Spotify playlist</ModalHeader>
            <ModalCloseButton />
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
              {unrecoverablePlaylist && !submitting && <Alert status='warning' mb={4} alignItems='start'>
                <AlertIcon mt={1} />
                <Box>
                  <AlertTitle>
                    A playlist may have been created, but we cannot complete it automatically.
                  </AlertTitle>
                  <AlertDescription>
                    To prevent creating a duplicate, playlist creation is blocked. Check Spotify before abandoning
                    this state and starting over.
                  </AlertDescription>
                </Box>
              </Alert>}
              <Field name='playlistName' validate={validatePlaylistName}>
                {({ field, form }: FieldProps) => (
                  <FormControl isInvalid={!!(form.errors.playlistName && form.touched.playlistName)} mb={3}>
                    <FormLabel htmlFor='playlistName'>Playlist name</FormLabel>
                    <Input {...field} id='playlistName' isDisabled={formLocked}
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
                            isDisabled={formLocked}
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
                            isDisabled={formLocked}
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
                    <Textarea {...field} id='playlistDescription' isDisabled={formLocked}
                              placeholder='Enter playlist description (optional)' />
                    <FormErrorMessage>{form.errors.playlistDescription?.toLocaleString()}</FormErrorMessage>
                  </FormControl>
                )}
              </Field>
            </ModalBody>
            <ModalFooter>
              {(activePendingPlaylist || unrecoverablePlaylist) && <Button colorScheme='red' variant='outline' mr={3}
                                                                           isDisabled={submitting} type='button'
                                                                           onClick={() => {
                                                                             completePlaylistRecovery(
                                                                               spotifyUserId,
                                                                               trackUris,
                                                                               recoveryScopeKey,
                                                                             );
                                                                             setHydratedRecovery({
                                                                               recovery: null,
                                                                               scopeKey: recoveryScopeKey,
                                                                             });
                                                                             props.resetForm({
                                                                               values: createDefaultPlaylistFormValues(),
                                                                             });
                                                                             closeModal();
                                                                           }}>
                Abandon playlist and reset
              </Button>}
              <Button variant='ghost' mr={3}
                      onClick={closeModal} type='button'>Close</Button>
              {!unrecoverablePlaylist && <Button colorScheme='blue' type='submit'
                                                 isDisabled={!recoveryHydrated || props.isSubmitting}
                                                 isLoading={props.isSubmitting}>
                {activePendingPlaylist ? 'Retry adding tracks' : 'Create Playlist'}
              </Button>}
            </ModalFooter>
          </ModalContent>
        </Form>
      )}
    </Formik>
  </Modal>;
}