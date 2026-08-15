export type GetServerSidePropsContext = {
  query: Record<string, string | string[] | undefined>;
};

export type GetServerSideProps<TProps = Record<string, unknown>> = (
  context: GetServerSidePropsContext,
) => Promise<
  | { props: TProps }
  | {
      redirect: {
        permanent: boolean;
        destination: string;
      };
    }
>;
