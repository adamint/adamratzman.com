declare module 'react-console-emulator' {
  import * as React from 'react';
  import { StyleProps } from '@chakra-ui/react';

  interface OptionProps {
    autoFocus?: boolean;
    dangerMode?: boolean;
    disableOnProcess?: boolean;
    noDefaults?: boolean;
    noAutomaticStdout?: boolean;
    noHistory?: boolean;
    noAutoScroll?: boolean;
    style?: any;
    contentStyle?: any;
  }

  interface LabelProps {
    welcomeMessage: boolean | string | string[];
    promptLabel: string;
    errorText?: string;
  }

  export interface CommandProps {
    commands?: any;
    commandCallback?: () => {};
  }

  export type TerminalProps = CommandProps &
    LabelProps &
    OptionProps &
    StyleProps;

  export default class Terminal extends React.Component<TerminalProps, {}> {
  }
}