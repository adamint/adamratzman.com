import { useData } from '../../../utils/useData';
import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Pagination from '@choc-ui/paginator';

export function PaginatedSpotifyDisplay({
                                          dataProducer,
                                          childDataMapper,
                                          limitPerPage,
                                          setLimitPerPage,
                                          pageOffset,
                                          setPageOffset,
                                          timeRange,
                                        }) {
  const { data, loading, error, update } = useData(async () => {
    return await dataProducer();
  });

  const history = useHistory();

  useEffect(() => {
    update(dataProducer);
  }, [limitPerPage, pageOffset, timeRange]);

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  console.log(data)


  if (loading) return null;
  return <>
    <Box mb={5}>
      {data.items.map(item => childDataMapper(item))}
    </Box>
    <Box>
      <Flex
        w='full'
        p={5}
        alignItems='center'
        justifyContent='center'
      >
        <Pagination
          colorScheme='blue'
          currentPage={pageOffset}
          total={data.total}
          showSizeChanger
          paginationProps={{ display: 'flex' }}
          pageSize={limitPerPage}
          pageSizeOptions={[10, 20, 25, 50]}
          onShowSizeChange={(currentPage, size) => setLimitPerPage(size)}
          onChange={newPage => setPageOffset(newPage - 1)}
        />
      </Flex>
    </Box>
  </>;

}