import React from 'react';

export interface RangeSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const RangeSlider = React.forwardRef<HTMLInputElement, RangeSliderProps>(
  ({ className = '', ...props }, ref) => (
    <input type="range" ref={ref} className={className} {...props} />
  )
);

RangeSlider.displayName = 'RangeSlider';

export default RangeSlider;
