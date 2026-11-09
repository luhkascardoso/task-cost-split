import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test/render';
import { SegmentedControl, Sheet, StatusSelect } from '..';

describe('SegmentedControl (compound)', () => {
  it('compartilha valor e onChange com as opções via Context', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await renderWithProviders(
      <SegmentedControl value="a" onChange={onChange} testID="seg">
        <SegmentedControl.Option value="a">Primeira</SegmentedControl.Option>
        <SegmentedControl.Option value="b" tone="success">Segunda</SegmentedControl.Option>
      </SegmentedControl>,
    );

    expect(screen.getByRole('radio', { name: 'Primeira' })).toBeSelected();
    expect(screen.getByTestId('seg-b')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Segunda' }));
    expect(onChange).toHaveBeenCalledWith('b');

    // Tocar na opção ativa não dispara onChange.
    onChange.mockClear();
    await user.press(screen.getByRole('radio', { name: 'Primeira' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('falha com mensagem clara fora do pai', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      renderWithProviders(<SegmentedControl.Option value="a">A</SegmentedControl.Option>),
    ).rejects.toThrow('dentro de <SegmentedControl>');
    jest.restoreAllMocks();
  });

  it('StatusSelect mantém rótulos do domínio e testIDs do E2E', async () => {
    await renderWithProviders(<StatusSelect value="paid" onChange={() => {}} testID="share-status-p1" />);
    expect(screen.getByRole('radio', { name: 'Pago' })).toBeSelected();
    expect(screen.getByTestId('share-status-p1-pending')).toBeOnTheScreen();
  });
});

describe('Sheet (compound)', () => {
  it('Sheet.Close usa o onClose do pai', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderWithProviders(
      <Sheet onClose={onClose}>
        <Sheet.Header>
          <Sheet.Title>Nova despesa</Sheet.Title>
          <Sheet.Close />
        </Sheet.Header>
        <Sheet.Footer>
          <Text>Ações</Text>
        </Sheet.Footer>
      </Sheet>,
    );

    expect(screen.getByText('Nova despesa')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
