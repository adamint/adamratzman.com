import { ProjectPage } from '../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../spotify-utils/auth/SpotifyLogoutButton';
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Heading,
  Link,
  SimpleGrid,
  Text,
  useClipboard,
  useToast,
} from '@chakra-ui/react';
import moment from 'moment';
import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import {
  createPkceCodeVerifier,
  getPkceAuthUrlFull,
  SpotifyAuthUtils,
} from '../../../spotify-utils/auth/SpotifyAuthUtils';
import { redirectToSpotifyLogin } from '../../../spotify-utils/auth/RedirectToSpotifyLogin';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';
import { useSpotifyStore } from '../../../components/utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import { PageTitle } from '../../../components/meta/PageTitle';

const spotifyScopes = [
  'ugc-image-upload',
  'playlist-modify-private',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-read-collaborative',
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-modify',
  'user-library-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-top-read',
  'app-remote-control',
  'streaming',
  'user-follow-modify',
  'user-follow-read',
];

function SpotifyGenerateTokenRoute() {
  const [spotifyClientId, spotifyRedirectUri] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyRedirectUri], shallow);
  const [spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyTokenInfo, state.setSpotifyTokenInfo], shallow);
  const setCodeVerifier = useSpotifyStore(state => state.setCodeVerifier);

  const { hasCopied, onCopy } = useClipboard(spotifyTokenInfo?.token['access_token'] ?? '');
  const [scopesToGenerate, setScopesToGenerate] = useState<string[]>([]);
  const [generatedLogin, setGeneratedLogin] = useState<{
    codeVerifier: string;
    state: string;
    url: string;
  }>();
  const toast = useToast();

  useDeepCompareEffect(() => {
    let isCurrent = true;
    void (async () => {
      const codeVerifier = createPkceCodeVerifier();
      const state = SpotifyAuthUtils.getRandomCode(32);
      const url = await getPkceAuthUrlFull(
        scopesToGenerate,
        spotifyClientId,
        spotifyRedirectUri(),
        codeVerifier,
        state,
      );
      if (isCurrent) {
        setGeneratedLogin({
          codeVerifier,
          state,
          url,
        });
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [scopesToGenerate, spotifyClientId, spotifyRedirectUri]);

  function handleCopyTokenButtonClicked() {
    onCopy();
    toast({
      status: 'success',
      title: 'Successfully copied token',
    });
  }

  async function handleRedirectToSpotifyLinkClicked() {
    if (generatedLogin) {
      await redirectToSpotifyLogin(
        generatedLogin.codeVerifier,
        '/projects/spotify/generate-token',
        setCodeVerifier,
        scopesToGenerate,
        spotifyClientId,
        spotifyRedirectUri(),
        generatedLogin.state,
      );
    }
  }

  function handleScopeCheckboxesChanged(newValues: string[]) {
    if (newValues.includes('all')) {
      setScopesToGenerate([...spotifyScopes]);
    } else if (newValues.includes('none')) {
      setScopesToGenerate([]);
      toast({
        status: 'info',
        title: 'Reset all scopes',
      });
    } else setScopesToGenerate([...newValues]);
  }

  return <SpotifyRouteComponent>
    <PageTitle title="Generate a Spotify OAuth Token" />
    <ProjectPage
      projectTitle='Generate a Spotify OAuth Token'
      topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}>
      {spotifyTokenInfo && <Box mb={5}>
        <Heading size='lg' mb={2}>Your current API access token</Heading>
        <Text>This API token contains the following
          scopes: <b>{spotifyTokenInfo.token.scope ? spotifyTokenInfo.token.scope.split(' ').join(', ') : 'none'}</b>.</Text>
        <Text mb={3}>It expires <b>{moment(spotifyTokenInfo.expiry).from(Date.now())}</b>.</Text>
        <Button colorScheme='blue' onClick={handleCopyTokenButtonClicked}>Copy access
          token {hasCopied && <>(again)</>}</Button>
      </Box>}
      <Box>
        <Heading size='lg' mb={4}>Generate a new access token</Heading>
        <CheckboxGroup colorScheme='blue' onChange={handleScopeCheckboxesChanged} value={scopesToGenerate}>
          <SimpleGrid columns={3} spacing='10px' maxW='800px' mb={5}>
            {spotifyScopes.map(scope => <Checkbox value={scope} key={scope}>{scope}</Checkbox>)}
            <Checkbox value='all'>All scopes</Checkbox>
            <Checkbox value='none'>Reset</Checkbox>
          </SimpleGrid>
        </CheckboxGroup>
        <Text fontSize='lg'><b>Your generated url is:</b> <Link
          href={generatedLogin?.url}
          onClick={(event) => {
            event.preventDefault();
            void handleRedirectToSpotifyLinkClicked();
          }}>{generatedLogin?.url}</Link></Text>
        {<Text>The redirect uri used to generate this link was: <u>https://adamratzman.com/projects/spotify/callback</u></Text>}
      </Box>
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyGenerateTokenRoute;
