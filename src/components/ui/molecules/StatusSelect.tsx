import { shareStatusLabel, type ShareStatus } from '@/domain';
import { SegmentedControl } from './SegmentedControl';

/** Tom de cada status quando ativo. Novo status = nova entrada (o TS cobra). */
const tone: Record<ShareStatus, 'success' | 'danger'> = {
  pending: 'danger',
  paid: 'success',
};

/** Ordem de exibição = ordem de `shareStatusLabel` no domínio. */
const options = Object.keys(shareStatusLabel) as ShareStatus[];

/**
 * Molécula: segmented "Pendente | Pago" do detalhe da despesa ("Status Select" no Figma).
 * Especialização do compound `SegmentedControl`.
 */
export function StatusSelect({
  value,
  onChange,
  disabled,
  testID,
}: {
  value: ShareStatus;
  onChange: (value: ShareStatus) => void;
  disabled?: boolean;
  /** Prefixo do testID; segmentos viram `<testID>-pending` / `<testID>-paid`. */
  testID?: string;
}) {
  return (
    <SegmentedControl value={value} onChange={onChange} disabled={disabled} testID={testID}>
      {options.map((status) => (
        <SegmentedControl.Option key={status} value={status} tone={tone[status]}>
          {shareStatusLabel[status]}
        </SegmentedControl.Option>
      ))}
    </SegmentedControl>
  );
}
