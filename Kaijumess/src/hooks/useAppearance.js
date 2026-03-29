import { useContext } from 'react';

import AppearanceContext from '../context/AppearanceContext';

export const useAppearance = () => {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }

  return context;
};

