import { useEffect, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import { subscribeToasts } from '../../hooks/useToast';

const MotionDiv = m.div;

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribeToasts((event) => {
      if (event.type === 'add') {
        setItems((prev) => [...prev, event.item]);
      } else if (event.type === 'remove') {
        setItems((prev) => prev.filter((i) => i.id !== event.id));
      }
    });
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 100,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {items.map((item) => {
          const isError = item.variant === 'error';
          const Icon = isError ? AlertCircle : Info;
          return (
            <MotionDiv
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="soft-card"
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                boxShadow: '0 10px 24px rgba(196,123,90,0.18)',
                border: isError
                  ? '1px solid rgba(217, 95, 89, 0.25)'
                  : '1px solid rgba(196,123,90,0.15)',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-ink)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Icon
                size={16}
                color={isError ? '#D95F59' : 'var(--text-body)'}
                style={{ flexShrink: 0 }}
              />
              <span>{item.message}</span>
            </MotionDiv>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
