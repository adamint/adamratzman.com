export interface TrackAttribute {
  name: string;
  id: string;
  description: string;
  type: TrackAttributeType;
  min?: number;
  max?: number;
  valueMapper?: (value: number) => number;
  defaultValue: number;
}

export enum TrackAttributeType {
  Integer,
  Float
}

export const tuneableTrackAttributes: TrackAttribute[] = [
  {
    name: 'Acousticness',
    id: 'acousticness',
    description: 'A confidence measure from 0.0 to 1.0 of whether the track is acoustic.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Danceability',
    id: 'danceability',
    description: 'Danceability describes how suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Duration in seconds',
    id: 'duration_ms',
    description: 'The duration of the track in seconds.',
    type: TrackAttributeType.Integer, // this is actually in ms
    min: 0,
    max: 10 * 60,
    valueMapper: value => value * 1000,
    defaultValue: 180,
  },
  {
    name: 'Energy',
    id: 'energy',
    description: 'Energy is a measure from 0.0 to 1.0 and represents a perceptual measure of intensity and activity.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Instrumentalness',
    id: 'instrumentalness',
    description: 'Predicts whether a track contains no vocals. Values above 0.5 are intended to represent instrumental tracks, but confidence is higher as the value approaches 1.0.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Key',
    id: 'key',
    description: 'The key the track is in. Integers map to pitches using standard Pitch Class notation. E.g. 0 = C, 1 = C♯/D♭, 2 = D, and so on.',
    type: TrackAttributeType.Integer,
    min: 0,
    max: 11,
    defaultValue: 0,
  },
  {
    name: 'Liveness',
    id: 'liveness',
    description: 'Detects the presence of an audience in the recording.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Loudness',
    id: 'loudness',
    description: 'The overall loudness of a track in decibels (dB). Values typically range between -60 and 0 db.',
    type: TrackAttributeType.Float,
    min: -100,
    max: 100,
    defaultValue: -30,
  },
  {
    name: 'Mode',
    id: 'mode',
    description: 'Mode indicates the modality (major or minor) of a track, the type of scale from which its melodic content is derived. Major is represented by 1 and minor is 0.',
    type: TrackAttributeType.Integer,
    min: 0,
    max: 1,
    defaultValue: 0,
  },
  {
    name: 'Popularity',
    id: 'popularity',
    description: 'The popularity of the track. The value will be between 0 and 100, with 100 being the most popular.',
    type: TrackAttributeType.Integer,
    min: 0,
    max: 100,
    defaultValue: 50,
  },
  {
    name: 'Speechiness',
    id: 'speechiness',
    description: 'Speechiness detects the presence of spoken words in a track.',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
  {
    name: 'Tempo (bpm)',
    id: 'tempo',
    description: 'The overall estimated tempo of a track in beats per minute (BPM).',
    type: TrackAttributeType.Float,
    min: 0,
    max: 400,
    defaultValue: 100,
  },
  {
    name: 'Time Signature',
    id: 'time_signature',
    description: 'An estimated overall time signature of a track. The time signature (meter) is a notational convention to specify how many beats are in each bar (or measure). The time signature ranges from 3 to 7 indicating time signatures of 3/4, to 7/4. A value of -1 may indicate no time signature, while a value of 1 indicates a rather complex or changing time signature.',
    type: TrackAttributeType.Integer,
    min: -1,
    max: 7,
    defaultValue: 5,
  },
  {
    name: 'Happiness (valence)',
    id: 'valence',
    description: 'A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry).',
    type: TrackAttributeType.Float,
    min: 0,
    max: 1,
    defaultValue: 0.5,
  },
];