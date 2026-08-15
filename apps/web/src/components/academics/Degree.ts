import React from 'react';

export interface Degree {
  schoolName: string | React.ReactElement;
  schoolLocation: string;
  degreeKind: string | React.ReactElement;
  degreeField: string | React.ReactElement;
  degreeDistinction?: string;
  startedDegree: string | React.ReactElement;
  finishedDegree: string | React.ReactElement;
  years: AcademicYear[];
  hasMajorGpa: boolean;
}

export function getAllClassesForDegree(degree: Degree): Class[] {
  return degree.years
    .flatMap(year => year.semesters)
    .flatMap(semester => {
      const transferClasses = semester.transferClasses ? semester.transferClasses.flatMap(transferClassesByInstitution => transferClassesByInstitution.classes) : [];
      return [...semester.classes, ...transferClasses];
    });
}

export interface AcademicYear {
  startYear: number;
  endYear: number;
  semesters: Semester[];
}

export interface Semester {
  name: string;
  note?: string | React.ReactElement;
  classes: SchoolClass[];
  transferClasses?: TransferClassesByInstitution[]
}

export interface TransferClassesByInstitution {
  institution: string;
  classes: TransferClass[]
}

export interface Class {
  code: string;
  title: string;
  topic?: string;
  credits: number;
  grade: Grade;
}

export interface SchoolClass extends Class {
}

export class TransferClass implements Class {
  code: string;
  title: string;
  credits: number;
  grade: Grade;
  transferredFrom: string;


  constructor(code: string, title: string, credits: number, transferredFrom: string) {
    this.title = title;
    this.code = code;
    this.credits = credits;
    this.grade = 'T';
    this.transferredFrom = transferredFrom;
  }
}

export function isTransferClass(clazz: SchoolClass | TransferClass): clazz is TransferClass {
  return (clazz as TransferClass).transferredFrom !== undefined;
}

type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F' | 'T' | 'In Progress'

export function convertGradeToGradePoint(grade: Grade): number {
  switch (grade) {
    case 'A+':
      return 4.0;
    case 'A':
      return 4.0;
    case 'A-':
      return 3.7;
    case 'B+':
      return 3.3;
    case 'B':
      return 3.0;
    case 'B-':
      return 2.7;
    case 'C+':
      return 2.3;
    case 'C':
      return 2.0;
    case 'C-':
      return 1.7;
    case 'D+':
      return 1.3;
    case 'D':
      return 1.0;
    case 'D-':
      return 0.7;
    case 'F':
      return 0.0;
    default:
      throw Error(grade);
  }
}

export function calculateGpaForClasses(classes: Class[]): number {
  const creditsArray = classes.map(clazz => clazz.credits);
  const gradePointArray = classes.map(clazz => convertGradeToGradePoint(clazz.grade) * clazz.credits);

  return gradePointArray.reduce((a, b) => a + b, 0) / creditsArray.reduce((a, b) => a + b, 0);
}

export type ParsedClassCode = {
  department: string;
  subject: string;
  code: string;
}

export function parseClassCodeString(code: string): ParsedClassCode {
  const split = code.split(' ');
  const [department, subject] = split[0].split('-');

  return {
    department: department,
    subject: subject,
    code: split[1],
  };
}