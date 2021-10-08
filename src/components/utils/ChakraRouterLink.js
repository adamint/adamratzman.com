import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@chakra-ui/react';

export function ChakraRouterLink({children, to, ...rest}) {
  if (to.startsWith("/")) return <Link as={RouterLink} to={to} color="#149dcc" {...rest}>{children}</Link>
  else return <Link href={to} color="#149dcc" {...rest}>{children}</Link>
}