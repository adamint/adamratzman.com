// noinspection HtmlUnknownTarget,HtmlRequiredTitleElement

import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';

class SiteBaseDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>
          <meta charSet='utf-8' />
          <link rel='shortcut icon' href='/favicon.png' type='image/x-icon' />

          <link href='https://fonts.googleapis.com/css?family=Rubik:300,400,500,700' rel='stylesheet' />
        </Head>
        <body>
        <Main />
        <NextScript />
        </body>
      </Html>
    );
  }
}

export default SiteBaseDocument;
