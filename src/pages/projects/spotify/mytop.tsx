import { ProjectPage } from '../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../spotify-utils/auth/SpotifyLogoutButton';
import { FormControl, FormLabel, Icon, Select, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import React, { useState } from 'react';
import { BsPeopleFill, MdPlayCircleOutline } from 'react-icons/all';
import { SpotifyTrack } from '../../../components/projects/spotify/views/SpotifyTrack';
import { PaginatedSpotifyDisplay } from '../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyArtist } from '../../../components/projects/spotify/views/SpotifyArtist';
import { TimeRange } from '../../../components/utils/SpotifyTypes';
import {
  PkceGuardedSpotifyWebApiJs,
  useSpotifyWebApiGuardValidPkceToken,
} from '../../../spotify-utils/auth/SpotifyAuthUtils';
import { useSpotifyStore } from '../../../components/utils/useSpotifyStore';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin';
import shallow from 'zustand/shallow';
import Head from 'next/head';

function SpotifyViewMyTopRoute() {
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);

  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [pageLoading, setPageLoading] = useState(false);
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  function handleTimeRangeChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    setTimeRange(event.target.value as TimeRange);
    setPageOffset(0);
  }

  return <SpotifyRouteComponent title='View your Spotify top tracks and artists'>
    {spotifyTokenInfo && <RequireSpotifyScopesOrElseShowLogin requiredScopes={['user-top-read']}
                                                              clientId={spotifyClientId}
                                                              redirectUri={spotifyRedirectUri()}
                                                              codeVerifier={codeVerifier}
                                                              setCodeVerifier={setCodeVerifier}
                                                              redirectPathAfter='/projects/spotify/mytop'
                                                              spotifyToken={spotifyTokenInfo.token}
                                                              title='View your Spotify top tracks and artists'>
      <Head>
        <title>Your top Spotify tracks and artists</title>
      </Head>

      <ProjectPage projectTitle='Your top tracks and artists'
                   topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                   isLoading={pageLoading}>
        <FormControl mb={5}>
          <FormLabel>Time Range</FormLabel>
          <Select value={timeRange} onChange={handleTimeRangeChanged}>
            <option value='short_term'>Short Term (past month)</option>
            <option value='medium_term'>Medium Term (past approx. six months)</option>
            <option value='long_term'>Long Term (past several years, including recently played)</option>
          </Select>
        </FormControl>

        <Tabs variant='enclosed'>
          <TabList>
            <Tab>Top Tracks <Icon as={MdPlayCircleOutline} ml={1} /></Tab>
            <Tab>Top Artists <Icon as={BsPeopleFill} ml={1} /></Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ShowTopTracks guardedSpotifyApi={guardedSpotifyApi}
                             timeRange={timeRange}
                             setPageLoading={setPageLoading}
                             limitPerPage={limitPerPage}
                             setLimitPerPage={setLimitPerPage}
                             pageOffset={pageOffset}
                             setPageOffset={setPageOffset}
              />
            </TabPanel>
            <TabPanel>
              <ShowTopArtists guardedSpotifyApi={guardedSpotifyApi}
                              timeRange={timeRange}
                              setPageLoading={setPageLoading}
                              limitPerPage={limitPerPage}
                              setLimitPerPage={setLimitPerPage}
                              pageOffset={pageOffset}
                              setPageOffset={setPageOffset}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ProjectPage>
    </RequireSpotifyScopesOrElseShowLogin>}
  </SpotifyRouteComponent>;
}

type ShowTopProps = {
  guardedSpotifyApi: PkceGuardedSpotifyWebApiJs;
  timeRange: 'short_term' | 'medium_term' | 'long_term';
  setPageLoading: Function;
  limitPerPage: number;
  setLimitPerPage: Function;
  pageOffset: number;
  setPageOffset: Function;
}

function ShowTopTracks({
                         guardedSpotifyApi,
                         timeRange,
                         setPageLoading,
                         limitPerPage,
                         setLimitPerPage,
                         pageOffset,
                         setPageOffset,
                       }: ShowTopProps) {
  async function getTopTrackData(limitPerPage: number, pageOffset: number) {
    setPageLoading(true);
    const data = await (await guardedSpotifyApi.getApi()).getMyTopTracks({
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
      time_range: timeRange,
    });
    setPageLoading(false);
    return data;
  }

  const childDataMapper = (track: SpotifyApi.TrackObjectFull) => <SpotifyTrack track={track} key={track.id} mb={5} />;

  return <PaginatedSpotifyDisplay dataProducer={getTopTrackData}
                                  childDataMapper={childDataMapper}
                                  filterNotNull={child => !!child}
                                  timeRange={timeRange}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
  />;
}

function ShowTopArtists({
                          guardedSpotifyApi,
                          timeRange,
                          setPageLoading,
                          limitPerPage,
                          setLimitPerPage,
                          pageOffset,
                          setPageOffset,
                        }: ShowTopProps) {

  async function getTopArtistData(limitPerPage: number, pageOffset: number) {
    setPageLoading(true);
    const data = await (await guardedSpotifyApi.getApi()).getMyTopArtists({
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
      time_range: timeRange,
    });
    setPageLoading(false);
    return data;
  }

  const childDataMapper = (artist: SpotifyApi.ArtistObjectFull) => <SpotifyArtist artist={artist} key={artist.id}
                                                                                  mb={5} />;

  return <PaginatedSpotifyDisplay dataProducer={getTopArtistData}
                                  childDataMapper={childDataMapper}
                                  filterNotNull={child => !!child}
                                  timeRange={timeRange}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
  />;
}

export default SpotifyViewMyTopRoute;