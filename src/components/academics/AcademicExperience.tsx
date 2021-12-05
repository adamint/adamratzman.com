import { AcademicYear, calculateGpaForClasses, Class, Degree, parseClassCodeString, Semester } from './Degree';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Checkbox, Divider,
  Flex,
  Heading,
  HStack,
  Spacer,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import React, { useState } from 'react';

type AcademicExperienceProps = {
  degree: Degree;
}

export function AcademicExperience({ degree }: AcademicExperienceProps) {
  const [shouldShowOnlyMajorCourses, setShouldShowOnlyMajorCourses] = useState<boolean>(false);

  const allClasses = degree.years
    .flatMap(year => year.semesters)
    .flatMap(semester => semester.classes);

  const degreeGpa = calculateGpaForClasses(allClasses.filter(clazz => clazz.grade !== 'T' && clazz.grade !== 'In Progress'));
  const majorGpa = calculateGpaForClasses(
    allClasses
      .filter(clazz => clazz.grade !== 'T' && clazz.grade !== 'In Progress')
      .filter(clazz => parseClassCodeString(clazz.code).department === 'CSCI'),
  );

  return <>
    <Box mb={1}>
      <Flex>
        <Box mb={1}>
          <Heading variant='light' size='md'>
            <b>{degree.schoolName}</b>, {degree.schoolLocation}
          </Heading>
          <Heading variant='light' size='md'>
            <i>{degree.degreeKind} in {degree.degreeField} {degree.degreeDistinction &&
              <b>{`with ${degree.degreeDistinction}`}</b>}</i>
          </Heading>
        </Box>
        <Spacer />
        <Box textAlign='right'>
          <Heading variant='light' size='md'>{degree.startedDegree} - {degree.finishedDegree}</Heading>
          <Heading variant='light' size='md'>GPA: {degreeGpa.toFixed(3)}</Heading>
          <Heading variant='light' size='md'>Major GPA: {majorGpa.toFixed(3)}</Heading>
        </Box>
      </Flex>
    </Box>

    <Box mb={5}>
      <Heading size='md' variant='light' mb={1}>Options</Heading>
      <Checkbox isChecked={shouldShowOnlyMajorCourses} onChange={e => setShouldShowOnlyMajorCourses(e.target.checked)}>
        Only show major courses
      </Checkbox>
    </Box>

    <Box mb={2}>
    {degree.years.map((academicYear, index) => <DisplayAcademicYear academicYear={academicYear}
                                                                    shouldShowOnlyMajorCourses={shouldShowOnlyMajorCourses}
                                                                    key={index} />)}
    </Box>

    <Text>Graduation!</Text>
  </>;
}

type DisplayAcademicYearProps = {
  academicYear: AcademicYear;
  shouldShowOnlyMajorCourses: boolean;
}

function DisplayAcademicYear({ academicYear, shouldShowOnlyMajorCourses }: DisplayAcademicYearProps) {
  return <Box mb={3}>
    <Heading size='lg' variant='semibold' mb={2}>{academicYear.startYear} - {academicYear.endYear}</Heading>
    {academicYear.semesters.map((semester, index) => <DisplaySemester semester={semester}
                                                                      shouldShowOnlyMajorCourses={shouldShowOnlyMajorCourses}
                                                                      key={index} />)}
  </Box>;
}

type DisplaySemesterProps = {
  semester: Semester;
  shouldShowOnlyMajorCourses: boolean;
}

function DisplaySemester({ semester, shouldShowOnlyMajorCourses }: DisplaySemesterProps) {
  let nonTransferClasses = semester.classes.filter(clazz => clazz.grade !== 'T');
  let transferClasses = semester.transferClasses;
  if (shouldShowOnlyMajorCourses) {
    nonTransferClasses = nonTransferClasses.filter(clazz => parseClassCodeString(clazz.code).department === 'CSCI');
    transferClasses = [];
  }
  const semesterGpa = nonTransferClasses.filter(clazz => clazz.grade !== 'In Progress').length > 0 ? calculateGpaForClasses(nonTransferClasses.filter(clazz => clazz.grade !== 'In Progress')).toFixed(3) : null;

  return <Box mb={5}>
    <Flex>
      <Box>
        <HStack>
          <Heading size='mdx' variant='semiLight'>{semester.name}</Heading>
        </HStack>
        {semester.note && <Text><i>({semester.note})</i></Text>}
      </Box>
      <Spacer />
      {semesterGpa && <Box textAlign='right'><Text>Semester GPA: {semesterGpa}</Text></Box>}
    </Flex>

    {nonTransferClasses.length > 0 && <DisplayClasses classes={nonTransferClasses} />}

    {transferClasses && transferClasses.length > 0 && <Box mt={4}>
      <Heading size='mdx' mb={1} variant='semiLight'>Transfer classes</Heading>
      <Accordion allowToggle>
        {transferClasses.map(transferClassesByInstitution => <Box key={transferClassesByInstitution.institution}>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex='1' textAlign='left'>
                  {transferClassesByInstitution.institution}
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <DisplayClasses classes={transferClassesByInstitution.classes} />
            </AccordionPanel>
          </AccordionItem>
        </Box>)}
      </Accordion>
    </Box>}

  </Box>;
}

type DisplayClassesProps = {
  classes: Class[]
}

function DisplayClasses({ classes }: DisplayClassesProps) {
  return <Table variant='simple'>
    <Thead>
      <Tr>
        <Th>Course</Th>
        <Th>Title</Th>
        <Th isNumeric>Hours</Th>
        <Th>Grade</Th>
      </Tr>
    </Thead>
    <Tbody>
      {classes.map(clazz => {
        return <Tr key={clazz.code}>
          <Td>{clazz.code}</Td>
          <Td>{clazz.title} {clazz.topic && <><br />(Topic: {clazz.topic})</>}</Td>
          <Td isNumeric>{clazz.credits}</Td>
          <Td>{clazz.grade}</Td>
        </Tr>;
      })}
    </Tbody>
  </Table>;
}