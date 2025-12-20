import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOrders } from '../../orders/hooks/useOrders';
import { Order } from '../../orders/types';
import { OrderStatus, UserRole } from '../../../shared/types';

interface NotificationContextData {
  newOrders: Order[];
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const NotificationContext = createContext<NotificationContextData | undefined>(undefined);

const NOTIFICATION_SOUND_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const { orders } = useOrders(); // Now consuming from the central context
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousNewOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    }
  }, []);

  const isKitchenUser = authState?.user.role === UserRole.KITCHEN;

  useEffect(() => {
    if (isKitchenUser && orders) {
      const currentNewOrders = orders.filter((order) =>
        order.items.some((item) => item.status === OrderStatus.NEW),
      );

      const currentNewOrderIds = new Set(currentNewOrders.map((o) => o.id));
      const newlyAddedOrders = currentNewOrders.filter(
        (o) => !previousNewOrderIds.current.has(o.id),
      );

      setNewOrders(currentNewOrders);

      if (newlyAddedOrders.length > 0) {
        setIsModalOpen(true);
        audioRef.current?.play().catch((e) => console.error('Audio playback failed:', e));
      }

      previousNewOrderIds.current = currentNewOrderIds;
    } else {
      // Clear notifications if not a kitchen user or logged out
      setNewOrders([]);
      previousNewOrderIds.current.clear();
    }
  }, [orders, isKitchenUser]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <NotificationContext.Provider value={{ newOrders, isModalOpen, openModal, closeModal }}>
      {children}
    </NotificationContext.Provider>
  );
};
