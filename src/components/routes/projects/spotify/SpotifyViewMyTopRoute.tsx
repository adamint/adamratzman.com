import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { FormControl, FormLabel, Icon, Select, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import React, { useState } from 'react';
import { BsPeopleFill, MdPlayCircleOutline } from 'react-icons/all';
import { SpotifyTrack } from './views/SpotifyTrack';
import { PaginatedSpotifyDisplay } from './views/PaginatedSpotifyDisplay';
import { SpotifyArtist } from './views/SpotifyArtist';
import { SpotifyRouteProps } from './SpotifyRoute';
import { TimeRange } from '../../../utils/SpotifyTypes';
import { PkceGuardedSpotifyWebApiJs } from '../../../../spotify-auth/SpotifyAuthUtils';

export function SpotifyViewMyTopRoute({ guardedSpotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  useDocumentTitle(`Your top Spotify tracks and artists`);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [pageLoading, setPageLoading] = useState(false);
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  function handleTimeRangeChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    setTimeRange(event.target.value as TimeRange);
    setPageOffset(0);
  }

  return <ProjectPage projectTitle='Your top tracks and artists'
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
  </ProjectPage>;
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

export function ShowTopTracks({
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
                                  timeRange={timeRange}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
  />;
}

export function ShowTopArtists({
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
                                  timeRange={timeRange}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
  />;
}
