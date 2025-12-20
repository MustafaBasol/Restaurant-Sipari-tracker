import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon } from '../../../shared/components/icons/Icons';

export const NotificationBell: React.FC = () => {
  const { newOrders, openModal } = useNotifications();
  const notificationCount = newOrders.length;

  return (
    <button onClick={openModal} className="relative p-2 rounded-full hover:bg-gray-200">
      <BellIcon />
      {notificationCount > 0 && (
        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {notificationCount}
        </span>
      )}
    </button>
  );
};
