import { ThemeProvider } from '@emotion/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimatedInput } from '../AnimatedInput';
import { theme } from '../../../styles/theme';

const renderInput = (props: Partial<React.ComponentProps<typeof AnimatedInput>> = {}) => {
  const onSubmit = props.onSubmit ?? jest.fn();
  const result = render(
    <ThemeProvider theme={theme}>
      <AnimatedInput value="answer" onChange={jest.fn()} onSubmit={onSubmit} {...props} />
    </ThemeProvider>
  );

  return { ...result, onSubmit };
};

describe('AnimatedInput submit action', () => {
  it('submits a trimmed answer when the visible action is clicked and prevents duplicates', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderInput({ value: '  answer  ', onSubmit });

    const submitButton = screen.getByRole('button', { name: 'Submit answer' });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('answer');
    expect(submitButton).toBeDisabled();
  });

  it('continues to submit with Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderInput({ onSubmit });

    await user.type(screen.getByRole('textbox', { name: 'Answer input' }), '{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('answer');
  });

  it('only submits once when duplicate submit events happen before rerender', () => {
    const onSubmit = jest.fn();
    const { container } = renderInput({ onSubmit });
    const form = container.querySelector('form');
    if (!form) throw new Error('AnimatedInput should render inside a form');

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('prevents empty answers and ignores Enter while composing text', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderInput({ value: '   ', onSubmit });

    const input = screen.getByRole('textbox', { name: 'Answer input' });
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
    await user.type(input, '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 229 });
    const form = input.closest('form');
    if (!form) throw new Error('AnimatedInput should render inside a form');
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
  });

  it('keeps the input and action disabled during transitions', () => {
    renderInput({ disabled: true });

    expect(screen.getByRole('textbox', { name: 'Answer input' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
  });

  it('unlocks after the transition finishes', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const { rerender } = renderInput({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    rerender(
      <ThemeProvider theme={theme}>
        <AnimatedInput value="answer" onChange={jest.fn()} onSubmit={onSubmit} disabled />
      </ThemeProvider>
    );
    rerender(
      <ThemeProvider theme={theme}>
        <AnimatedInput value="answer" onChange={jest.fn()} onSubmit={onSubmit} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled();
  });
});
