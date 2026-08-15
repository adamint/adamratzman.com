export type SpotifyImage = {
  url: string;
};

export type SpotifyNamedEntity = {
  id: string;
  name: string;
};

export type SpotifyExternalUrl = {
  spotify: string;
};

export type SpotifyCategoryListItem = {
  icons: SpotifyImage[];
  id: string;
  name: string;
};

export type SpotifyPlaylistCard = {
  description?: string | null;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: {
    display_name?: string | null;
    id: string;
  };
  tracks: {
    total: number;
  };
};

export type SpotifyTrackCard = {
  album: {
    images: SpotifyImage[];
  };
  artists: SpotifyNamedEntity[];
  duration_ms: number;
  id: string;
  name: string;
  popularity: number;
  preview_url?: string | null;
};

export type SpotifyArtistDetailsData = {
  artist: {
    external_urls: SpotifyExternalUrl;
    followers: {
      total: number;
    };
    genres: string[];
    id: string;
    images: SpotifyImage[];
    name: string;
    popularity: number;
  };
  artistAlbums: {
    total: number;
  };
  artistTopTracks: {
    tracks: SpotifyTrackCard[];
  };
  relatedArtists: SpotifyNamedEntity[];
};

export type SpotifyCategoryDetailsData = {
  category: {
    icons: SpotifyImage[];
    name: string;
  };
  categoryPlaylists: {
    items: SpotifyPlaylistCard[];
  };
};

export type SpotifyPlaylistDetails = {
  collaborative: boolean;
  description?: string | null;
  external_urls: SpotifyExternalUrl;
  followers: {
    total: number;
  };
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: {
    display_name?: string | null;
    followers?: {
      total: number;
    } | null;
    id: string;
  };
  public: boolean | null;
  tracks: {
    total: number;
  };
};

export type SpotifyTrackDetails = {
  album: {
    images: SpotifyImage[];
  };
  artists: SpotifyNamedEntity[];
  external_urls: SpotifyExternalUrl;
  id: string;
  name: string;
};

export type SpotifyUserDetailsData = {
  totalPlaylists: number;
  user: {
    display_name?: string | null;
    external_urls: SpotifyExternalUrl;
    followers?: {
      total: number;
    } | null;
    id: string;
    images?: SpotifyImage[] | null;
  };
};
