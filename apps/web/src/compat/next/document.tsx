import React, { type PropsWithChildren } from 'react';

export type DocumentContext = unknown;

type WrapperProps = PropsWithChildren<React.HTMLAttributes<HTMLElement>>;

export class Document extends React.Component {
  static getInitialProps(context: DocumentContext) {
    void context;
    return Promise.resolve({});
  }
}

export function Html({ children }: WrapperProps) {
  return <>{children}</>;
}

export function Head({ children }: WrapperProps) {
  return <>{children}</>;
}

export function Main() {
  return null;
}

export function NextScript() {
  return null;
}

export default Document;
