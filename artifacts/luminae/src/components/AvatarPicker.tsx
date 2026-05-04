import { motion } from 'framer-motion';
import { AVATARS, type AvatarDef } from '@/lib/avatars';

interface AvatarPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {AVATARS.map((avatar: AvatarDef) => {
        const selected = avatar.id === selectedId;
        return (
          <motion.button
            key={avatar.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onSelect(avatar.id)}
            className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border-2 transition-colors ${
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border/40 bg-card/40 hover:border-border'
            }`}
          >
            <div
              className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
              style={{
                boxShadow: selected ? `0 0 14px ${avatar.accent}66` : undefined,
                border: selected ? `2px solid ${avatar.accent}88` : '2px solid transparent',
              }}
            >
              <img
                src={avatar.image}
                alt={avatar.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <span
              className="text-[10px] font-semibold leading-tight text-center"
              style={{ color: selected ? avatar.accent : undefined }}
            >
              {avatar.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
