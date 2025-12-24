import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  const previousNewItemIdsByOrder = useRef<Map<string, Set<string>>>(new Map());

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

      let hasNewSignal = false;
      const nextNewItemIdsByOrder = new Map<string, Set<string>>();

      for (const order of currentNewOrders) {
        const currentNewItemIds = new Set<string>(
          order.items.filter((i) => i.status === OrderStatus.NEW).map((i) => i.id),
        );
        nextNewItemIdsByOrder.set(order.id, currentNewItemIds);

        const prevSet = previousNewItemIdsByOrder.current.get(order.id);
        if (!prevSet) {
          // First time seeing this order with NEW items.
          hasNewSignal = true;
          continue;
        }

        for (const itemId of currentNewItemIds) {
          if (!prevSet.has(itemId)) {
            // An additional NEW item was added to an existing order.
            hasNewSignal = true;
            break;
          }
        }
      }

      setNewOrders(currentNewOrders);

      if (hasNewSignal) {
        if (!isModalOpen) setIsModalOpen(true);
        audioRef.current?.play().catch((e) => console.error('Audio playback failed:', e));
      }

      previousNewItemIdsByOrder.current = nextNewItemIdsByOrder;
    } else {
      // Clear notifications if not a kitchen user or logged out
      setNewOrders([]);
      previousNewItemIdsByOrder.current.clear();
    }
  }, [orders, isKitchenUser, isModalOpen]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <NotificationContext.Provider value={{ newOrders, isModalOpen, openModal, closeModal }}>
      {children}
    </NotificationContext.Provider>
  );
};
