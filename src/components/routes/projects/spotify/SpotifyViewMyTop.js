import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { FormControl, FormLabel, Icon, Select, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useState } from 'react';
import { BsPeopleFill, MdPlayCircleOutline } from 'react-icons/all';
import { SpotifyTrack } from './SpotifyTrack';
import { PaginatedSpotifyDisplay } from './PaginatedSpotifyDisplay';
import { SpotifyArtist } from './SpotifyArtist';


export function SpotifyViewMyTop({ spotifyApi, setSpotifyTokenInfo }) {
  useDocumentTitle(`Your top Spotify tracks and artists`);
  const [timeRange, setTimeRange] = useState('short_term');
  const [limitPerPage, setLimitPerPage] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  return <ProjectPage
    projectTitle='Your top tracks and artists'
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={pageLoading}>
    <FormControl mb={5}>
      <FormLabel>Time Range</FormLabel>
      <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
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
          <ShowTopTracks spotifyApi={spotifyApi}
                         timeRange={timeRange}
                         limitPerPage={limitPerPage}
                         setLimitPerPage={setLimitPerPage}
                         pageOffset={pageOffset}
                         setPageOffset={setPageOffset}
                         setPageLoading={setPageLoading} />
        </TabPanel>
        <TabPanel>
          <ShowTopArtists spotifyApi={spotifyApi}
                         timeRange={timeRange}
                         limitPerPage={limitPerPage}
                         setLimitPerPage={setLimitPerPage}
                         pageOffset={pageOffset}
                         setPageOffset={setPageOffset}
                         setPageLoading={setPageLoading} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </ProjectPage>;
}

export function ShowTopTracks({
                                spotifyApi,
                                timeRange,
                                limitPerPage,
                                setLimitPerPage,
                                pageOffset,
                                setPageOffset,
                                setPageLoading,
                              }) {
  async function getTopTrackData() {
    setPageLoading(true);
    const data = await spotifyApi.getMyTopTracks({
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
      time_range: timeRange,
    });
    setPageLoading(false);
    return data;
  }

  const childDataMapper = track => <SpotifyTrack track={track} key={track.id} mb={5} />;

  return <PaginatedSpotifyDisplay dataProducer={getTopTrackData}
                                  childDataMapper={childDataMapper}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
                                  timeRange={timeRange}
  />;
}

export function ShowTopArtists({
                                spotifyApi,
                                timeRange,
                                limitPerPage,
                                setLimitPerPage,
                                pageOffset,
                                setPageOffset,
                                setPageLoading,
                              }) {
  async function getTopArtistData() {
    setPageLoading(true);
    const data = await spotifyApi.getMyTopArtists({
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
      time_range: timeRange,
    });
    setPageLoading(false);
    return data;
  }

  const childDataMapper = artist => <SpotifyArtist artist={artist} key={artist.id} mb={5} />;

  return <PaginatedSpotifyDisplay dataProducer={getTopArtistData}
                                  childDataMapper={childDataMapper}
                                  limitPerPage={limitPerPage}
                                  setLimitPerPage={setLimitPerPage}
                                  pageOffset={pageOffset}
                                  setPageOffset={setPageOffset}
                                  timeRange={timeRange}
  />;
}
