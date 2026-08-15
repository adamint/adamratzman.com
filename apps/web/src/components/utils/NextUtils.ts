import axios from 'axios';

export const isSSR = typeof window === 'undefined';

export const fetcher = (url: string) => axios.get(url).then(res => res.data);
