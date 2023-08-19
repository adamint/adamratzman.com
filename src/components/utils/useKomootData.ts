import useSWR from 'swr';
import { fetcher } from './SwrUtils';

interface KomootTourData {
  sortedTours: Tour[];
}

export function useKomootData(): KomootTourData | null {
  const request = useSWR<Tour[], Error>("http://adamratzmancombackend.azurewebsites.net/komoot-tours", fetcher)

  const tours = request.data;
  if (request.isLoading || request.error || !tours) return null;

  const sortedTours = tours.sort((tour, otherTour) => {
    return Date.parse(tour.date) - Date.parse(otherTour.date)
  })

  return {
    sortedTours: sortedTours
  }

}

export interface Tour {
  changed_at: string
  date: string
  distance: number
  duration: number
  elevation_down: number
  elevation_up: number
  _embedded: Embedded
  id: number
  kcal_active: number
  kcal_resting: number
  _links: Links2
  map_image: MapImage
  map_image_preview: MapImagePreview
  name: string
  potential_route_update: boolean
  source: string
  sport: string
  start_point: StartPoint
  status: string
  time_in_motion: number
  type: string
  vector_map_image: VectorMapImage
  vector_map_image_preview: VectorMapImagePreview
}

export interface Embedded {
  creator: Creator
}

export interface Creator {
  avatar: Avatar
  display_name: string
  is_premium: boolean
  _links: Links
  status: string
  username: string
}

export interface Avatar {
  src: string
  templated: boolean
  type: string
}

export interface Links {
  relation: Relation
  self: Self
}

export interface Relation {
  href: string
  templated: boolean
}

export interface Self {
  href: string
}

export interface Links2 {
  coordinates: Coordinates
  cover_images: CoverImages
  creator: Creator2
  participants: Participants
  self: Self2
  timeline: Timeline
  translations: Translations
}

export interface Coordinates {
  href: string
}

export interface CoverImages {
  href: string
}

export interface Creator2 {
  href: string
}

export interface Participants {
  href: string
}

export interface Self2 {
  href: string
}

export interface Timeline {
  href: string
}

export interface Translations {
  href: string
}

export interface MapImage {
  attribution: string
  src: string
  templated: boolean
  type: string
}

export interface MapImagePreview {
  attribution: string
  src: string
  templated: boolean
  type: string
}

export interface StartPoint {
  alt: number
  lat: number
  lng: number
}

export interface VectorMapImage {
  attribution: string
  src: string
  templated: boolean
  type: string
}

export interface VectorMapImagePreview {
  attribution: string
  src: string
  templated: boolean
  type: string
}
