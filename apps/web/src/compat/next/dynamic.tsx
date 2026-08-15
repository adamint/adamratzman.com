import React, { type ComponentType, useEffect, useState } from 'react';

type DynamicComponentLoader<TProps> = () => Promise<
  ComponentType<TProps> | { default: ComponentType<TProps> }
>;

type DynamicOptions = {
  ssr?: boolean;
};

function resolveComponent<TProps>(
  module: ComponentType<TProps> | { default: ComponentType<TProps> },
) {
  return 'default' in module ? module.default : module;
}

export default function dynamic<TProps extends object>(
  loader: DynamicComponentLoader<TProps>,
  options?: DynamicOptions,
) {
  void options;

  return function DynamicComponent(props: TProps) {
    const [LoadedComponent, setLoadedComponent] = useState<ComponentType<TProps> | null>(null);

    useEffect(() => {
      let isMounted = true;

      void loader().then((module) => {
        if (isMounted) {
          setLoadedComponent(() => resolveComponent(module));
        }
      });

      return () => {
        isMounted = false;
      };
    }, []);

    if (!LoadedComponent) {
      return null;
    }

    return <LoadedComponent {...props} />;
  };
}
