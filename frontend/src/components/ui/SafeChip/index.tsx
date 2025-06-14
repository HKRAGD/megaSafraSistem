import React from 'react';
import { Chip, ChipProps } from '@mui/material';

/**
 * A wrapper around Material-UI's Chip component to mitigate a known regression
 * in v7.1.1 where `onClick` can be null/undefined leading to a TypeError,
 * especially when `clickable` is implicitly or explicitly false.
 * 
 * GitHub Issues: 
 * - https://github.com/mui/material-ui/issues/46262
 * - https://github.com/mui/material-ui/issues/46275
 * 
 * This wrapper ensures `onClick` is always a function (no-op if not provided) and
 * correctly manages the `clickable` prop to prevent the bug.
 */
const SafeChip: React.FC<ChipProps> = ({ onClick, clickable, ...rest }) => {
  let finalOnClick = onClick;
  let finalClickable = clickable;

  // Case 1: onClick is explicitly provided and is a function.
  // The Chip should be clickable.
  if (typeof onClick === 'function') {
    // If clickable was not explicitly set, default it to true.
    if (finalClickable === undefined) {
      finalClickable = true;
    }
  }
  // Case 2: onClick is NOT a function (null, undefined, etc.) or not provided.
  // The Chip should NOT be clickable, and onClick should be a no-op to prevent internal errors.
  else {
    finalOnClick = () => {}; // Provide a no-op function to prevent TypeError if called internally
    // If clickable was not explicitly set, or was null/undefined, force it to false.
    // This is crucial for the bug: the error happens when onClick is invalid AND clickable is false.
    // By making onClick a no-op, we prevent the "invalid onClick" part, but we must also ensure
    // clickable is explicitly false if the Chip is not meant to be interactive.
    if (finalClickable === undefined || finalClickable === null) {
      finalClickable = false;
    }
    // If clickable was explicitly set to true, we respect it, but this scenario
    // (onClick not a function, but clickable=true) is usually an anti-pattern.
    // However, for robustness, we'll still pass the no-op onClick.
  }

  return <Chip onClick={finalOnClick} clickable={finalClickable} {...rest} />;
};

export default SafeChip; 