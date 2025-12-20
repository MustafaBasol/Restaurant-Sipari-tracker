import React from 'react';
import { OrderStatus } from '../../../shared/types';
import { useLanguage } from '../../../shared/hooks/useLanguage';

interface KitchenItemStatusToggleProps {
  status: OrderStatus;
  onChange: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

const KitchenItemStatusToggle: React.FC<KitchenItemStatusToggleProps> = ({
  status,
  onChange,
  disabled,
}) => {
  const { t } = useLanguage();

  const baseClasses =
    'px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const handleStatusClick = (newStatus: OrderStatus) => {
    if (status !== newStatus && !disabled) {
      onChange(newStatus);
    }
  };

  return (
    <div className="flex items-center bg-gray-200/80 rounded-full p-1">
      <button
        onClick={() => handleStatusClick(OrderStatus.IN_PREPARATION)}
        disabled={disabled}
        className={`${baseClasses} ${
          status === OrderStatus.IN_PREPARATION
            ? 'bg-status-prep text-white shadow-sm'
            : 'text-text-secondary hover:bg-gray-300'
        }`}
      >
        {t('statuses.IN_PREPARATION')}
      </button>
      <button
        onClick={() => handleStatusClick(OrderStatus.READY)}
        disabled={disabled}
        className={`${baseClasses} ${
          status === OrderStatus.READY
            ? 'bg-status-ready text-white shadow-sm'
            : 'text-text-secondary hover:bg-gray-300'
        }`}
      >
        {t('statuses.READY')}
      </button>
    </div>
  );
};

export default KitchenItemStatusToggle;
