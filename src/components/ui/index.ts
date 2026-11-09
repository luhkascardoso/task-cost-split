/**
 * Design system em níveis do Atomic Design (docs/12-atomic-design-e-compound.md).
 * Importe sempre daqui (`@/components/ui`), nunca do arquivo do nível.
 * Regra: cada nível só importa níveis abaixo (atoms ← molecules ← organisms ← templates).
 */

// Átomos: peças indivisíveis, só tokens + Text
export * from './atoms/Avatar';
export * from './atoms/Button';
export * from './atoms/Card';
export * from './atoms/Input';
export * from './atoms/Logo';
export * from './atoms/StatusBadge';
export * from './atoms/Text';

// Moléculas: grupos simples de átomos com uma função
export * from './molecules/AvatarGroup';
export * from './molecules/EmptyState';
export * from './molecules/Fab';
export * from './molecules/SegmentedControl';
export * from './molecules/StatusSelect';

// Organismos: seções distintas da interface
export * from './organisms/TabHeader';

// Templates: estrutura de página, sem dados
export * from './templates/Screen';
export * from './templates/Sheet';
