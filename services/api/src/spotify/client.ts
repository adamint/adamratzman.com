import SpotifyWebApiNode from 'spotify-web-api-node';
import { z } from 'zod';

export type SpotifyClient = Pick<
  SpotifyWebApiNode,
  | 'getAvailableGenreSeeds'
  | 'getPlaylistTracks'
  | 'getRecommendations'
  | 'getUserPlaylists'
  | 'searchArtists'
  | 'searchTracks'
  | 'getCategories'
  | 'getCategory'
  | 'getPlaylistsForCategory'
  | 'getTrack'
  | 'getArtist'
  | 'getArtistTopTracks'
  | 'getArtistAlbums'
  | 'getArtistRelatedArtists'
  | 'getUser'
  | 'getPlaylist'
>;

export type SpotifyClientFactory = () => Promise<SpotifyClient>;

const credentialSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
});

export async function createSpotifyClient(): Promise<SpotifyClient> {
  const credentials = credentialSchema.parse(process.env);
  const client = new SpotifyWebApiNode({
    clientId: credentials.SPOTIFY_CLIENT_ID,
    clientSecret: credentials.SPOTIFY_CLIENT_SECRET,
  });
  const token = await client.clientCredentialsGrant();
  client.setAccessToken(token.body.access_token);
  return client;
}
