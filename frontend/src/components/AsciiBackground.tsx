import { useState, useEffect } from 'react';

const PAIRS = [
  ['[', ']'],
  ['{', '}'],
  ['<', '>'],
  ['(', ')']
];

const generateNestedSequence = (layers: number) => {
  let left = '';
  let right = '';
  for (let i = 0; i < layers; i++) {
    const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    left = left + pair[0];
    right = pair[1] + right;
  }
  return left + right;
};

const generateRow = (cols: number) => {
  let row = '';
  while (row.length < cols) {
    const sequence = generateNestedSequence(Math.floor(Math.random() * 5) + 3);
    row += sequence + '  '; // add spacing
  }
  return row.substring(0, cols);
};

export default function AsciiBackground() {
  const [rows, setRows] = useState<string[]>([]);
  const ROWS_COUNT = 30;
  const COLS_COUNT = 150;

  useEffect(() => {
    // Initial generation
    const initial = Array.from({ length: ROWS_COUNT }, () => generateRow(COLS_COUNT));
    setRows(initial);

    // Animate by shifting the whole grid and generating new rows, 
    // or by randomly mutating a row completely to simulate that hacking feel.
    const interval = setInterval(() => {
      setRows((prev) => {
        const next = [...prev];
        // Replace 3 random rows completely every tick for a "glitchy" fast change
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * ROWS_COUNT);
          next[idx] = generateRow(COLS_COUNT);
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-start justify-center opacity-[0.15]"
      style={{
        maskImage: 'radial-gradient(circle at 50% 30%, black 10%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 30%, black 10%, transparent 70%)'
      }}
    >
      <div className="font-mono text-xs leading-none text-brand whitespace-pre font-bold tracking-widest mt-10">
        {rows.join('\n')}
      </div>
    </div>
  );
}

