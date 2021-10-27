import SpotifyWebApiNode from 'spotify-web-api-node';

export async function getClientCredentialsSpotifyApiNode() {
  const spotifyApi = new SpotifyWebApiNode({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });
  const tokenResponse = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(tokenResponse.body.access_token);
  return spotifyApi;
}
