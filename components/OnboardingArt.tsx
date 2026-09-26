import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// Картинки первых экранов раньше грузились ссылками с чужого CDN и на
// устройстве не открывались — оставался пустой кружок. Рисуем их сами: своя
// графика не зависит от чужого сервера, не требует лицензии и не добавляет
// файлов в сборку.

type ArtProps = { size: number };

const INK = '#1F2937';
const ACCENT = '#F0B90B';
const PAPER = '#FFFFFF';

// Экран 1: карточка мастера и лупа поверх — «находи мастеров».
function FindMasters({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect x="26" y="34" width="120" height="104" rx="18" fill={PAPER} />
      <Circle cx="60" cy="70" r="16" fill={ACCENT} />
      <Path d="M44 96c0-8 7-14 16-14s16 6 16 14z" fill={ACCENT} />
      <Rect x="88" y="60" width="44" height="9" rx="4.5" fill={INK} opacity={0.85} />
      <Rect x="88" y="78" width="30" height="9" rx="4.5" fill={INK} opacity={0.35} />
      <Rect x="44" y="110" width="88" height="9" rx="4.5" fill={INK} opacity={0.2} />
      <Circle cx="134" cy="126" r="34" fill="none" stroke={INK} strokeWidth={10} />
      <Line x1="158" y1="150" x2="178" y2="170" stroke={INK} strokeWidth={12} strokeLinecap="round" />
    </Svg>
  );
}

// Экран 2: календарь с выбранным днём — «онлайн запись».
function OnlineBooking({ size }: ArtProps) {
  const dots = [0, 1, 2, 3].flatMap((row) => [0, 1, 2, 3].map((col) => ({ row, col })));
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect x="28" y="36" width="144" height="136" rx="20" fill={PAPER} />
      <Path d="M28 56a20 20 0 0 1 20-20h104a20 20 0 0 1 20 20v14H28z" fill={INK} />
      <Rect x="58" y="22" width="12" height="28" rx="6" fill={INK} />
      <Rect x="130" y="22" width="12" height="28" rx="6" fill={INK} />
      {dots.map(({ row, col }) => {
        const cx = 56 + col * 30;
        const cy = 94 + row * 22;
        const isPicked = row === 2 && col === 2;
        return (
          <Circle
            key={`${row}-${col}`}
            cx={cx}
            cy={cy}
            r={isPicked ? 13 : 6}
            fill={isPicked ? ACCENT : INK}
            opacity={isPicked ? 1 : 0.25}
          />
        );
      })}
      <Path
        d="M110 138l5 6 10-11"
        fill="none"
        stroke={PAPER}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Экран 3: часы и облачко сообщения — «управляй временем».
function ManageTime({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle cx="88" cy="96" r="60" fill={PAPER} />
      <Circle cx="88" cy="96" r="60" fill="none" stroke={INK} strokeWidth={10} />
      <Line x1="88" y1="96" x2="88" y2="62" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <Line x1="88" y1="96" x2="112" y2="110" stroke={ACCENT} strokeWidth={9} strokeLinecap="round" />
      <Path
        d="M124 120h48a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14h-26l-16 14v-14h-6a14 14 0 0 1-14-14v-26a14 14 0 0 1 14-14z"
        fill={ACCENT}
      />
      <Circle cx="140" cy="147" r="5" fill={PAPER} />
      <Circle cx="156" cy="147" r="5" fill={PAPER} />
      <Circle cx="172" cy="147" r="5" fill={PAPER} />
    </Svg>
  );
}

const ART = {
  find: FindMasters,
  booking: OnlineBooking,
  time: ManageTime,
};

export type OnboardingArtName = keyof typeof ART;

export function OnboardingArt({ name, size }: { name: OnboardingArtName; size: number }) {
  const Art = ART[name];
  return <Art size={size} />;
}
