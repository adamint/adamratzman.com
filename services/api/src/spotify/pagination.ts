export type SpotifyPagination<Item> = {
  items: Item[];
  next?: string | null;
  total?: number;
};

export async function getAllPages<Response extends SpotifyPagination<Item>, Item>(
  request: (limit: number, offset: number) => Promise<Response>,
  limit = 50,
): Promise<Response> {
  const firstResponse = await request(limit, 0);
  let currentResponse = firstResponse;
  let aggregatedItems = [...firstResponse.items];
  let total = aggregatedItems.length;
  let expectedTotal = currentResponse.total;

  while (currentResponse.next && (expectedTotal === undefined || total < expectedTotal)) {
    const nextResponse = await request(limit, total);
    if (nextResponse.items.length === 0) {
      break;
    }

    currentResponse = nextResponse;
    aggregatedItems = aggregatedItems.concat(currentResponse.items);
    total = aggregatedItems.length;
    expectedTotal = currentResponse.total ?? expectedTotal;
  }

  return {
    ...firstResponse,
    ...currentResponse,
    items: aggregatedItems,
    total: currentResponse.total ?? expectedTotal,
  };
}
