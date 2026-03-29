import { useContext } from 'react';

import NotificationCenterContext from '../context/NotificationCenterContext';

export const useNotificationCenter = () => useContext(NotificationCenterContext);
