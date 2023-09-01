import {
  Box,
  Heading,
  Image,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Text,
  useColorMode,
} from '@chakra-ui/react';
import { DashedSpanWithTooltip } from '../components/utils/DashedSpanWithTooltip';
import { ChakraRouterLink } from '../components/utils/ChakraRouterLink';
import { TitledSection } from '../components/containers/TitledSection';
import { IuTridentIcon } from '../components/icons/IuTridentIcon';
import { Experience } from '../components/home/Experience';
import { TechnicalSkillsSection } from '../components/home/TechnicalSkillsSection';
import { ColorModeSwitcher } from '../ColorModeSwitcher';
import Head from 'next/head';
import { bachelorsDegree, mastersDegree, mbaDegree } from '../components/academics/Degrees';
import { calculateGpaForClasses, getAllClassesForDegree } from '../components/academics/Degree';
import { MicrosoftIcon } from '../components/icons/MicrosoftIcon';
import { useColorModeColor } from '../components/utils/useColorModeColor';
import dynamic from 'next/dynamic';
import { ViewToursByMonthComponent } from '../components/projects/fitness/ViewToursByMonth';

function HomeRoute() {
  const oppositeColorMode = useColorMode().colorMode === 'dark' ? 'light' : 'dark';
  const ViewActivityByWeekComponent = dynamic(async () => (await import('../components/projects/fitness/ViewActivityByWeek')).ViewActivityByWeek, { ssr: false });

  return <>
    <Head>
      <title>Home</title>
    </Head>
    <Box mb={5}>
      <Heading fontSize='2.5rem' variant='light' mb={3}>Hi. I&apos;m <DashedSpanWithTooltip
        tooltip='You thought there was going to be something here, didn&apos;t you?'>Adam
        Ratzman</DashedSpanWithTooltip>, a
        software engineer at Microsoft.</Heading>
      <Text variant='bold'>You can read below to learn more about me or see some of my <ChakraRouterLink
        href='/projects'>interactive
        projects →</ChakraRouterLink></Text>
      <Text>Have a strong preference towards a {oppositeColorMode}er color scheme? <ColorModeSwitcher
        aria-label='Switch color mode' /></Text>
    </Box>

    <TitledSection title='About me'>
      <Text mb={1}>Currently, I&apos;m a Software Engineer at <b>Microsoft</b> <MicrosoftIcon /> on
        the <ChakraRouterLink
          target='_blank' href='https://github.com/dotnet/project-system'>Visual Studio .NET Developer Experience
          team</ChakraRouterLink>, where I help C# and VB.NET developers be more productive.</Text>

      <Text mb={5}>I graduated from <b>Indiana University Bloomington</b> <IuTridentIcon />, where I received a BS and
        MS in Computer Science. I build software and distributed systems and tools, and in addition to
        my <PuppyPopover />, I'm an avid runner and biker and track my activities using <ChakraRouterLink
          href='https://komoot.de'>Komoot</ChakraRouterLink>.</Text>

      <ViewActivityByWeekComponent />
      <ViewToursByMonthComponent />
    </TitledSection>

    <TitledSection title='Education'>
      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title={<><Box as='span'>MS in Computer Science</Box> (<ChakraRouterLink href='/academics/masters'>See
                    what I studied</ChakraRouterLink>)</>}
                  date='Spring 2021 - Fall 2021'
                  additionalRightSideContext={<>GPA: <ChakraRouterLink
                    href='/academics/masters'><u>{calculateGpaForClasses(getAllClassesForDegree(mastersDegree).filter(clazz => clazz.grade !== 'T' && clazz.grade !== 'In Progress')).toFixed(3)}</u></ChakraRouterLink></>}
      />

      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title={<><Box as='span'>Bachelor of Science in Computer Science</Box> (<ChakraRouterLink
                    href='/academics/bachelors'>See what I studied</ChakraRouterLink>)</>}
                  date='Fall 2019 - Fall 2021'
                  additionalRightSideContext={<>GPA: <ChakraRouterLink
                    href='/academics/bachelors'><u>{calculateGpaForClasses(getAllClassesForDegree(bachelorsDegree).filter(clazz => clazz.grade !== 'T' && clazz.grade !== 'In Progress')).toFixed(3)}</u></ChakraRouterLink></>}
                  bullets={[
                    'Honors: Hudson & Holland Scholar, Founders Scholar, Provost’s Scholarship, Hutton Honors College.',
                    'Graduated with Highest Distinction, awarded to graduates with a 3.9 or above GPA.',
                    'Part of the BS/MS Computer Science program.',
                  ]}
      />
    </TitledSection>

    <TitledSection title='Work Experience'>
      <Experience place='Microsoft'
                  location='Redmond, WA'
                  title='Software Engineer'
                  date='January 2022 - Present'
                  bullets={[
                    'A member of the C# Project team in the Developer Division at Microsoft.',
                    'I help VS .NET developers be more productive in their work, and help bring new .NET features to Visual Studio. Sometimes, I break things (sorry). Slightly more often, I fix them.',
                  ]}
      />

      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title='Associate Instructor, Introduction to Software Systems (CSCI-C 212)'
                  date='August 2021 - December 2021'
                  bullets={[
                    'One of 10 AIs and UIs to help in this introductory CS core class',
                    'Co-lead a weekly lab',
                  ]}
      />

      <Experience place='Microsoft'
                  location='Redmond, WA (Remote)'
                  title='Software Engineering Intern'
                  date='May 2021 - August 2021'
                  bullets={[
                    'Returned to the Service Fabric Atlas team, completing a project on chaos testing',
                  ]}
      />

      <Experience place='Naval Surface Warfare Center, Crane Division'
                  location='Crane, IN (Remote)'
                  title='Software Engineering Intern'
                  date='August 2020 - April 2021'
                  bullets={[
                    'Cleared role',
                  ]}
      />

      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title='Undergraduate Instructor, Data Analysis and Mining (CSCI-B 365)'
                  date='January 2021 - May 2021'
                  bullets={[
                    'One of four undergraduate instructors for Data Analysis and Mining (CSCI-B365), an introduction to probabilistic AI',
                  ]}
      />

      <Experience place='Microsoft'
                  location='Redmond, WA (Remote)'
                  title='Software Engineering Intern'
                  date='May 2020 - July 2020'
                  bullets={[
                    'Developed a POC extension to the Atlas RP (formerly Azure Service Fabric Mesh) layer in Microsoft Azure Service Fabric',
                    'Collaborated in a remote environment to meet deadlines',
                  ]}
      />

      <Experience place='E-gineering, LLC'
                  location='Indianapolis, IN'
                  title='Software Engineering Intern'
                  date='June 2019 - August 2019'
                  bullets={[
                    'Collaborated with Product Owner to identify and implement website enhancements',
                    'Implemented automated email and phone notifications for users',
                    'Dockerized application for simplified local development',
                    'Found and eliminated technical debt and legacy security vulnerabilities',
                  ]}
      />

      <Experience place='E-gineering, LLC'
                  location='Indianapolis, IN'
                  title='DevOps Intern'
                  date='May 2018 - August 2018'
                  bullets={[
                    'Dockerized client’s Java-based applications',
                    'Deployed client applications on POC Kubernetes clusters and presented solutions to meet client’s goal of eliminating physical data centers',
                  ]}
      />

    </TitledSection>

    <TechnicalSkillsSection />

    <TitledSection title='Selected Projects'>
      <Experience place={<Link href='https://github.com/adamint/spotify-web-api-kotlin'>Spotify Web API - Kotlin</Link>}
                  title='Creator, Maintainer'
                  date='September 2017 - Present'
                  bullets={[
                    'Created and maintain a modern, asynchronous Kotlin MPP library for the Spotify Web, Web Playback, and auth APIs with 140+ stars',
                    'Developed using TDD and Agile methods',
                  ]}
      />
      <Experience place={<Link href='https://ap-calculus-review-sohalski.herokuapp.com/'>AP Calculus (Calculus I) Review
        Site</Link>}
                  title='Co-creator'
                  date='May 2019 - June 2019'
                  bullets={[
                    'Created a comprehensive review site for calculus theorems, derivatives, and integrals, with options to test yourself with randomly-generated relevant problems',
                  ]}
      />
      <Experience place='Ardent'
                  title='Creator'
                  date='January 2015 - May 2018'
                  bullets={[
                    'Developed a popular, internationalized, comprehensive Discord bot',
                    'Directed a distributed team of 2 developers and 9 translators localizing into 11 languages',
                    'Oversaw consistent monthly user and revenue growth, with profitability within 3 months of launch',
                  ]}
      />

    </TitledSection>


  </>;
}

function PuppyPopover() {
  const colorModeColor = useColorModeColor();

  return <Popover>
    <PopoverTrigger>
      <Link color='current' borderBottom={`1px dashed ${colorModeColor}`}>puppy</Link>
    </PopoverTrigger>
    <Portal>
      <PopoverContent>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Benjamin at 2</PopoverHeader>
        <PopoverBody><Image src='/ben.jpg' /></PopoverBody>
      </PopoverContent></Portal>
  </Popover>;
}

export default HomeRoute;