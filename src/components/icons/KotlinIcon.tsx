import { Icon } from '@chakra-ui/react';
import { IconProps } from '@chakra-ui/icon';

export function KotlinIcon(props: IconProps) {
  return <Icon viewBox='0 0 500 500' {...props}>
    <style type='text/css'>{'\n\t.st0{fill:url(#SVGID_1_);}\n'}</style>
    <g id='Logotypes'>
      <g>
        <linearGradient id='SVGID_1_' gradientUnits='userSpaceOnUse' x1={500.0035} y1={579.1058} x2={-0.09653803}
                        y2={1079.2058} gradientTransform='matrix(0.9998 0 0 0.9998 9.651873e-02 -578.99)'>
          <stop offset={0.003435144} style={{
            stopColor: '#E44857',
          }} />
          <stop offset={0.4689} style={{
            stopColor: '#C711E1',
          }} />
          <stop offset={1} style={{
            stopColor: '#7F52FF',
          }} />
        </linearGradient>
        <polygon className='st0' points='500,500 0,500 0,0 500,0 250,250  ' />
      </g>
    </g>
  </Icon>;
}