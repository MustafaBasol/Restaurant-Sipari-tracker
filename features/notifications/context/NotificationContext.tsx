import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOrders } from '../../orders/hooks/useOrders';
import { Order } from '../../orders/types';
import { OrderStatus, UserRole } from '../../../shared/types';
import type { OrderNotificationSoundPreset } from '../../../shared/types';
import {
  fetchOrderNotificationSoundBlobUrl,
  playOrderNotificationSoundPreset,
  revokeObjectUrl,
} from '../../../shared/lib/orderNotificationSound';

interface NotificationContextData {
  newOrders: Order[];
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const NotificationContext = createContext<NotificationContextData | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const { orders } = useOrders(); // Now consuming from the central context
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const customSoundUrlRef = useRef<string | null>(null);
  const isLoadingCustomRef = useRef(false);
  const previousNewItemIdsByOrder = useRef<Map<string, Set<string>>>(new Map());

  const preset = (authState?.tenant as any)?.orderNotificationSoundPreset as
    | OrderNotificationSoundPreset
    | undefined;
  const soundPreset: OrderNotificationSoundPreset = preset ?? 'BELL';
  const hasCustom = Boolean((authState?.tenant as any)?.orderNotificationSoundMime);

  const ensureCustomAudioLoaded = async () => {
    if (typeof window === 'undefined') return;
    if (!hasCustom) return;
    if (customSoundUrlRef.current) return;
    if (isLoadingCustomRef.current) return;

    isLoadingCustomRef.current = true;
    try {
      const url = await fetchOrderNotificationSoundBlobUrl();
      if (!url) return;
      customSoundUrlRef.current = url;
      audioRef.current = new Audio(url);
    } finally {
      isLoadingCustomRef.current = false;
    }
  };

  const playNotificationSound = async () => {
    if (soundPreset !== 'CUSTOM') {
      await playOrderNotificationSoundPreset(soundPreset);
      return;
    }

    await ensureCustomAudioLoaded();
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
    } catch {
      // ignore
    }
    await a.play();
  };

  useEffect(() => {
    // If user switches away from CUSTOM, drop the blob URL.
    if (soundPreset !== 'CUSTOM') {
      revokeObjectUrl(customSoundUrlRef.current);
      customSoundUrlRef.current = null;
      audioRef.current = null;
      return;
    }

    // If CUSTOM is selected, best-effort preload.
    ensureCustomAudioLoaded().catch(() => {
      // ignore
    });

    return () => {
      revokeObjectUrl(customSoundUrlRef.current);
      customSoundUrlRef.current = null;
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundPreset, hasCustom, authState?.tenant?.id]);

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
        playNotificationSound().catch((e) => console.error('Audio playback failed:', e));
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
