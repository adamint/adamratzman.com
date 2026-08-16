import useSWR from 'swr';
import { fetcher } from './SwrUtils';

interface PaginationResponse<T> {
  data: T;
  total: number;
  next?: PaginationRequest | null;
  previous?: PaginationRequest | null;
}

export interface ActivityDataResult<T> {
  data: PaginationResponse<T> | null;
  error: Error | null;
  isLoading: boolean;
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
                                       }: useActivityStatsByWeekProps): ActivityDataResult<ActivityStatsByWeekResponse> {
  const latestToursUrl = `/api/komoot/activity-stats-by-week?limit=${limit}&offset=${offset}`;

  const request = useSWR<PaginationResponse<ActivityStatsByWeekResponse>, Error>(latestToursUrl, fetcher);

  return {
    data: request.data ?? null,
    error: request.error ?? null,
    isLoading: request.isLoading,
  };
}

type useToursByMonthProps = PaginationProps

export type ToursByMonthResponse = ToursInMonthYear[]

export function useToursByMonth({
                                  offset,
                                  limit,
                                }: useToursByMonthProps): ActivityDataResult<ToursByMonthResponse> {
  const latestToursUrl = `/api/komoot/latest-komoot-tours-by-month?limit=${limit}&offset=${offset}`;

  const request = useSWR<PaginationResponse<ToursByMonthResponse>, Error>(latestToursUrl, fetcher);

  return {
    data: request.data ?? null,
    error: request.error ?? null,
    isLoading: request.isLoading,
  };
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