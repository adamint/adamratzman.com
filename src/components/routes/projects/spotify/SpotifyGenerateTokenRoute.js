import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
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
import { getPkceAuthUrlFull, redirectToSpotifyLogin } from '../../../../spotify-auth/SpotifyAuthUtils';
import { spotifyClientId, spotifyRedirectUri } from './SpotifyRoute';

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

export function SpotifyGenerateTokenRoute({ spotifyTokenInfo, setSpotifyTokenInfo, codeVerifier, setCodeVerifier }) {
  useDocumentTitle(`Generate a Spotify OAuth Token`);
  const { expiry, token } = spotifyTokenInfo;
  const { hasCopied, onCopy } = useClipboard(token['access_token']);
  const [scopesToGenerate, setScopesToGenerate] = useState([]);
  const [generatedOAuthRedirectUrl, setGeneratedOAuthRedirectUrl] = useState();
  const toast = useToast();

  useDeepCompareEffect(() => {
    (async () => {
      setGeneratedOAuthRedirectUrl(await getPkceAuthUrlFull(scopesToGenerate, spotifyClientId, spotifyRedirectUri, codeVerifier, null));
    })();
  }, [scopesToGenerate]);

  function handleCopyTokenButtonClicked() {
    onCopy();
    toast({
      status: 'success',
      title: 'Successfully copied token',
    });
  }

  async function handleRedirectToSpotifyLinkClicked() {
    await redirectToSpotifyLogin(codeVerifier, '/projects/spotify/generate-token', setCodeVerifier, scopesToGenerate, spotifyClientId, spotifyRedirectUri)
  }

  function handleScopeCheckboxesChanged(newValues) {
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

  return <ProjectPage
    projectTitle='Generate a Spotify OAuth Token'
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}>
    <Box mb={5}>
      <Heading size='lg' mb={2}>Your current API access token</Heading>
      <Text>This API token contains the following scopes: <b>{token.scope ? token.scope.split(' ').join(', ') : "none"}</b>.</Text>
      <Text mb={3}>It expires <b>{moment(expiry).from(Date.now())}</b>.</Text>
      <Button colorScheme='blue' onClick={handleCopyTokenButtonClicked}>Copy access
        token {hasCopied && <>(again)</>}</Button>
    </Box>
    <Box>
      <Heading size='lg' mb={4}>Generate a new access token</Heading>
      <CheckboxGroup colorScheme='blue' onChange={handleScopeCheckboxesChanged} value={scopesToGenerate}>
        <SimpleGrid columns={3} spacing='10px' maxW='800px' mb={5}>
          {spotifyScopes.map(scope => <Checkbox value={scope} key={scope}>{scope}</Checkbox>)}
          <Checkbox value='all'>All scopes</Checkbox>
          <Checkbox value='none'>Reset</Checkbox>
        </SimpleGrid>
      </CheckboxGroup>
      <Text fontSize='lg'><b>Your generated url is:</b> <Link onClick={handleRedirectToSpotifyLinkClicked}>{generatedOAuthRedirectUrl}</Link></Text>
    </Box>
  </ProjectPage>;
}

