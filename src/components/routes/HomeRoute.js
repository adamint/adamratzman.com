import { Box, Heading, Link, Text } from '@chakra-ui/react';
import { DashedSpan } from '../utils/DashedSpan';
import { ChakraRouterLink } from '../utils/ChakraRouterLink';
import { TitledSection } from '../containers/TitledSection';
import { IuTridentIcon } from '../icons/IuTridentIcon';
import { MicrosoftIcon } from '../icons/MicrosoftIcon';
import { Experience } from './home/Experience';
import { useColorModeColor } from '../utils/useColorModeColor';
import { ReactIcon } from '../icons/ReactIcon';
import { JavaIcon } from '../icons/JavaIcon';
import { CSharpIcon } from '../icons/CSharpIcon';
import { KotlinIcon } from '../icons/KotlinIcon';
import { TechnicalSkillsSection } from './home/TechnicalSkillsSection';
import { useDocumentTitle } from '../utils/useDocumentTitle';

export function HomeRoute() {
  useDocumentTitle('Home');
  const colorModeColor = useColorModeColor();

  return <>
    <Box mb={5}>
      <Heading fontSize='2.5rem' variant='light' mb={3}>Hi. I'm <DashedSpan
        tooltip="You thought there was going to be something here, didn't you?">Adam Ratzman</DashedSpan>, a graduate
        student at Indiana University Bloomington and a JVM <JavaIcon w={35} h={35} /> <KotlinIcon w={35} h={35} />,
        React <ReactIcon />, and .NET <CSharpIcon w={35} h={35} /> developer.</Heading>
      <Text variant='bold'>You can read below to learn more about me or see some of my <ChakraRouterLink to='/projects'>interactive
        projects →</ChakraRouterLink></Text>
    </Box>

    <TitledSection title='About me'>
      <Text>I'm a last-semester graduate student studying Computer Science. I build software and distributed systems,
        tools, and APIs.</Text>
      <Text>Currently, I'm an Associate Instructor for <i>Introduction to Software
        Systems</i> at <Link href='https://cs.indiana.edu' color={colorModeColor}><DashedSpan>Indiana
        University</DashedSpan> <IuTridentIcon
        w={6} h={6} /></Link>. After graduating this winter, I will be joining Microsoft <MicrosoftIcon w={6}
                                                                                                        h={6} /> as
        a Software Engineer in Microsoft's Developer Division.</Text>
      <Text>I am also a former software engineering intern at E-gineering and Microsoft.</Text>
    </TitledSection>

    <TitledSection title='Education'>
      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title='MS in Computer Science'
                  date='May 2021 - December 2021'
                  additionalRightSideContext={<>GPA: <u>4.00</u></>}
      />

      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title='Bachelor of Science in Computer Science'
                  date='August 2019 - May 2021'
                  additionalRightSideContext={<>GPA: <u>3.94</u></>}
                  bullets={[
                    'Honors: Hudson & Holland Scholar, Founders Scholar, Provost’s Scholarship, Hutton Honors College.',
                    'Part of the BS/MS Computer Science program.',
                  ]}
      />
    </TitledSection>

    <TitledSection title='Work Experience'>
      <Experience place='Indiana University Bloomington'
                  location='Bloomington, IN'
                  title='Associate Instructor, Introduction to Software Systems (CSCI-C 212)'
                  date='August 2021 - Present'
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

      <Experience place='Chick-Fil-A'
                  location='Westfield, IN'
                  title='Team Member'
                  date='November 2017 - May 2018'
      />

    </TitledSection>

    <TechnicalSkillsSection />

    <TitledSection title='Selected Projects'>
      <Experience place={<Link href='https://github.com/adamint/spotify-web-api-kotlin'>Spotify Web API - Kotlin</Link>}
                  title='Creator, Maintainer'
                  date='September 2017 - Present'
                  bullets={[
                    'Created and maintain a modern, asynchronous Kotlin MPP library for the Spotify Web, Web Playback, and auth APIs with 110+ stars',
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