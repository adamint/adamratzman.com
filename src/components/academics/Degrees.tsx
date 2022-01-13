import { AcademicYear, Degree, TransferClass } from './Degree';
import { IuTridentIcon } from '../icons/IuTridentIcon';

export const freshmanYearBachelors: AcademicYear = {
  startYear: 2019,
  endYear: 2020,
  semesters: [
    {
      name: 'Fall 2019',
      classes: [
        {
          code: 'CSCI-C 212',
          title: 'Intro to Software Systems',
          credits: 4,
          grade: 'A',
        },
        {
          code: 'CSCI-C 241',
          title: 'Discrete Structures for Computer Science',
          credits: 3,
          grade: 'A-',
        },
        {
          code: 'CSCI-Y 390',
          title: 'Undergraduate Independent Study',
          credits: 3,
          grade: 'A+',
        },
        {
          code: 'EDUC-U 215',
          title: 'Foundations of Undergraduate Success',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'FRIT-F 314',
          title: 'Creative/Critical Writing in French',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'HON-H 241',
          title: 'Scientific Uncertainty & Discovery',
          credits: 3,
          grade: 'A',
        },
      ],
      transferClasses: [
        {
          institution: 'College Board Advanced Placement',
          classes: [
            new TransferClass(
              'CSCI-C 102',
              'Great Ideas in Computing',
              3,
              'AP test',
            ),
            new TransferClass(
              'CSCI-C 200',
              'Intro to Computers & Programming',
              4,
              'AP test',
            ),
            new TransferClass(
              'ENG-W 131',
              'Semester 1 English Composition',
              0,
              'AP test',
            ),
            new TransferClass(
              'FRIT-F 200',
              'Second Year French I: Language & Culture',
              3,
              'AP test',
            ),
            new TransferClass(
              'FRIT-F 250',
              'Second Year French II: Language & Culture',
              3,
              'AP test',
            ),
            new TransferClass(
              'GEOG-G 110',
              'Human Geography In a Changing World',
              3,
              'AP test',
            ),
            new TransferClass(
              'PHYS-UN 100',
              'Physics Undistributed-100 Level',
              3,
              'AP test',
            ),
            new TransferClass(
              'STAT-S 300',
              'Intro to Applied Statistical Methods',
              4,
              'AP test',
            ),
            new TransferClass(
              'ECON-E 202',
              'Intro to Macroeconomics',
              3,
              'AP test',
            ),
            new TransferClass(
              'MATH-M 211',
              'Calculus I',
              4,
              'AP test',
            ),
            new TransferClass(
              'POLS-Y 103',
              'Intro to American Politics',
              3,
              'AP test',
            ),
          ],
        },
      ],
    },
    {
      name: 'Spring 2020',
      note: 'This semester was interrupted midway due to COVID-19',
      classes: [
        {
          code: 'CSCI-B 365',
          title: 'Data Analysis and Mining',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'CSCI-C 343',
          title: 'Intro to Software Systems',
          credits: 4,
          grade: 'A-',
        },
        {
          code: 'FRIT-F 316',
          title: 'Conversational Practice',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'MIL-G 102',
          title: 'Foundations in Leadership',
          credits: 2,
          grade: 'A',
        },
        {
          code: 'POLS-Y 109',
          title: 'Intro to International Relations',
          credits: 3,
          grade: 'A-',
        },
        {
          code: 'CSCI-Y 395',
          title: 'Career Development for Computer Science Majors',
          credits: 1,
          grade: 'A+',
        },
        {
          code: 'SPH-H 318',
          title: 'Drug Use in American Society',
          credits: 3,
          grade: 'A',
        },
      ],
    },
    {
      name: 'Summer 2020',
      note: 'These classes were completed virtually during my remote internship with Microsoft',
      classes: [
        {
          code: 'GNDR-G 225',
          title: 'Gender, Sexuality, & Pop Culture',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'CSCI-C 323',
          title: 'Mobile App Development',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'EAS-E 131',
          title: 'Oceans & Our Global Environment',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'STAT-S 350',
          title: 'Intro to Statistical Inference',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'MATH-M 216',
          title: 'Calculus II',
          credits: 5,
          grade: 'A+',
        },
      ],
    },
  ],
};

export const sophomoreYearBachelors: AcademicYear = {
  startYear: 2020,
  endYear: 2021,
  semesters: [
    {
      name: 'Fall 2020',
      note: 'This semester was completed entirely virtually due to COVID-19',
      classes: [
        {
          code: 'CSCI-B 351',
          title: 'Intro to Artificial Intelligence',
          credits: 3,
          grade: 'A-',
        },
        {
          code: 'CSCI-B 363',
          title: 'Bioinformatics Algorithms',
          credits: 4,
          grade: 'A',
        },
        {
          code: 'CSCI-C 292',
          title: 'Intro to Game Programming',
          credits: 3,
          grade: 'A+',
        },
        {
          code: 'STAT-S 352',
          title: 'Data Modeling and Inference',
          credits: 3,
          grade: 'A+',
        },
        {
          code: 'CSCI-C 290',
          title: 'Topics in Computer Science',
          topic: 'Machine Learning for Everyone',
          credits: 1.5,
          grade: 'A',
        },
      ],
    },
    {
      name: 'Spring 2021',
      note: 'Except for HON-H 238, this semester was completed entirely virtually due to COVID-19',
      classes: [
        {
          code: 'CSCI-B 403',
          title: 'Intro to Algorithm Design & Analysis',
          credits: 3,
          grade: 'A-',
        },
        {
          code: 'ILS-Z 604',
          title: 'Topics in Library & Information Science',
          topic: 'Deception and Counterintelligence',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'HON-H 238',
          title: 'Politics and Communication',
          topic: 'Applied Improvisation',
          credits: 3,
          grade: 'A+',
        },
        {
          code: 'CSCI-A 290',
          title: 'Tools for Computing',
          topic: 'JavaScript',
          credits: 1.5,
          grade: 'A+',
        },
        {
          code: 'SOAD-N 110',
          title: 'Intro to Studio Art',
          credits: 3,
          grade: 'A',
        },
      ],
    },
  ],
};

export const juniorYearBachelors: AcademicYear = {
  startYear: 2021,
  endYear: 2021,
  semesters: [
    {
      name: 'Fall 2021',
      note: 'This semester was completed in-person',
      classes: [
        {
          code: 'CSCI-C 295',
          title: 'Leadership and Learning',
          credits: 1,
          grade: 'A+',
        },
      ],
    },
  ],
};

export const bachelorsDegree: Degree = {
  schoolName: <>Indiana University Bloomington <IuTridentIcon /></>,
  schoolLocation: 'Bloomington, Indiana',
  degreeKind: 'Bachelor of Science',
  degreeField: 'Computer Science',
  degreeDistinction: 'Highest Distinction',
  startedDegree: 'Fall 2019',
  finishedDegree: 'Fall 2021',
  years: [
    {
      startYear: 2017,
      endYear: 2018,
      semesters: [
        {
          name: 'Summer 2018',
          classes: [],
          transferClasses: [
            {
              institution: 'Ivy Tech Community College',
              classes: [
                new TransferClass(
                  'AST-A 100',
                  'The Solar System',
                  3,
                  'Ivy Tech Community College',
                ),
                new TransferClass(
                  'BIOL-L 104',
                  'Introductory Biology Lectures',
                  3,
                  'Ivy Tech Community College',
                ),
              ],
            },
          ],
        },
      ],
    },
    freshmanYearBachelors,
    sophomoreYearBachelors,
    juniorYearBachelors,
  ],
};

const sophomoreYearMasters: AcademicYear = {
  startYear: 2020,
  endYear: 2021,
  semesters: [
    {
      name: 'Summer 2021',
      note: 'This semester was completed entirely virtually due to COVID-19 and my Microsoft internship',
      classes: [
        {
          code: 'CSCI-Y 790',
          title: 'Graduate Independent Study',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'CSCI-Y 798',
          title: 'Professional Practicum/Internship',
          credits: 3,
          grade: 'A',
        },
        {
          code: 'ILS-Z 604',
          title: 'Topics in Library & Information Science',
          topic: 'Information and Culture',
          credits: 3,
          grade: 'A',
        },
      ],
    },
  ],
};

const juniorYearMasters: AcademicYear = {
  startYear: 2021,
  endYear: 2021,
  semesters: [
    {
      name: 'Fall 2021',
      note: 'This semester was completed entirely in-person',
      classes: [
        {
          code: 'CSCI-B 565',
          title: 'Data Mining',
          credits: 3,
          grade: 'B+',
        },
        {
          code: 'CSCI-B 649',
          title: 'Topics in Systems',
          topic: 'Organizational Informatics & Economic Security',
          credits: 3,
          grade: 'B',
        },
        {
          code: 'CSCI-B 659',
          title: 'Topics in Artificial Intelligence',
          topic: 'Computational & Linguistic Analysis',
          credits: 3,
          grade: 'B-',
        },
        {
          code: 'ILS-Z 555',
          title: 'Strategic Intelligence',
          credits: 3,
          grade: 'A',
        },
      ],
    },
  ],
};


export const mastersDegree: Degree = {
  schoolName: <>Indiana University Bloomington <IuTridentIcon /></>,
  schoolLocation: 'Bloomington, Indiana',
  degreeKind: 'Master of Science',
  degreeField: 'Computer Science',
  startedDegree: 'Summer 2021',
  finishedDegree: 'Fall 2021',
  years: [
    sophomoreYearMasters,
    juniorYearMasters,
  ],
};
