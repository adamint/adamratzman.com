import useSWR from 'swr';
import { fetcher } from './SwrUtils';

interface PaginationResponse<T> {
  data: T;
  total: number;
  next?: PaginationRequest | null;
  previous?: PaginationRequest | null;
}

export interface PaginationRequest {
  offset: number;
  limit: number;
}

export interface Pair<K, T> {
  first: K;
  second: T;
}

export interface WeekMonthYearPair {
  weekStartDay: number;
  weekStartMonth: number;
  weekEndDay: number;
  weekEndMonth: number;
  year: number;
}

export interface DayMonth {
  day: number;
  month: number;
}

export type SportType = 'Biking' | 'EBiking' | 'Running' | 'Hiking' | 'Other'

export type ActivityStatsByWeekResponse = Pair<WeekMonthYearPair, Record<SportType, number>>[]

type PaginationProps = {
  offset: number;
  limit: number;
}

type useActivityStatsByWeekProps = PaginationProps

export function useActivityStatsByWeek({
                                         offset,
                                         limit,
                                       }: useActivityStatsByWeekProps): PaginationResponse<ActivityStatsByWeekResponse> | null {
  const latestToursUrl = `${process.env.NEXT_PUBLIC_REDIRECT_PROTOCOL}://${process.env.NEXT_PUBLIC_BACKEND_SITE_URL}/activity-stats-by-week?limit=${limit}&offset=${offset}`;

  const request = useSWR<PaginationResponse<ActivityStatsByWeekResponse>, Error>(latestToursUrl, fetcher);

  const data = request.data;
  if (request.isLoading || request.error || !data) return null;

  return data;
}

type useToursByMonthProps = PaginationProps

export type ToursByMonthResponse = ToursInMonthYear[]

export function useToursByMonth({
                                  offset,
                                  limit,
                                }: useToursByMonthProps): PaginationResponse<ToursByMonthResponse> | null {
  const latestToursUrl = `${process.env.NEXT_PUBLIC_REDIRECT_PROTOCOL}://${process.env.NEXT_PUBLIC_BACKEND_SITE_URL}/latest-komoot-tours-by-month?limit=${limit}&offset=${offset}`;

  const request = useSWR<PaginationResponse<ToursByMonthResponse>, Error>(latestToursUrl, fetcher);

  const data = request.data;
  if (request.isLoading || request.error || !data) return null;

  return data;
}

export type ToursInMonthYear = {
  monthYearPair: MonthYearPair;
  tours: PublicTourInfo[];
  distanceBySportType: Record<SportType, number>;
}

type MonthYearPair = {
  month: string;
  year: number;
}

export type PublicTourInfo = {
  name: string;
  duration: number;
  distance: number;
  sportType: SportType;
  bicycleInfo?: SerializableBikeInfo;
  date: SerializableLocalDate;
  mapImage: MapImage
  elevation: RouteElevation;
}

type SerializableBikeInfo = {
  name: string;
  isElectric: boolean;
}

type SerializableLocalDate = {
  dateMillis: number;
  minute: number;
  hourOfDay: number;
  dayOfWeek: SerializableDayOfWeek;
  dayOfMonth: number;
  month: SerializableMonth;
  year: number;
}

type SerializableDayOfWeek = {
  number: number;
  name: string;
}

type SerializableMonth = SerializableDayOfWeek

type RouteElevation = {
  up: number;
  down: number;
}

export interface MapImage {
  attribution: string;
  src: string;
  templated: boolean;
  type: string;
}