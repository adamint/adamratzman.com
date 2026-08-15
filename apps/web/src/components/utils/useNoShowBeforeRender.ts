import { useEffect, useState } from 'react';

export function useNoShowBeforeRender(): boolean {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    setShow(true);
  }, []);

  return show;
}