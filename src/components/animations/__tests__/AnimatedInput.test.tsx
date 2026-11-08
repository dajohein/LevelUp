import { ThemeProvider } from '@emotion/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { AnimatedInput } from '../AnimatedInput';
import { theme } from '../../../styles/theme';

const renderInput = (props: Partial<ComponentProps<typeof AnimatedInput>> = {}) => {
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
    expect(screen.getByRole('textbox', { name: 'Answer input' })).toBeEnabled();
  });

  it('continues to submit with Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderInput({ onSubmit });

    await user.type(screen.getByRole('textbox', { name: 'Answer input' }), '{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('answer');
  });

  it('only submits once when duplicate clicks happen before rerender', () => {
    const onSubmit = jest.fn();
    const { container } = renderInput({ onSubmit });
    const button = screen.getByRole('button', { name: 'Submit answer' });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(container.querySelector('form')).toBeNull();
  });

  it('prevents empty answers', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderInput({ value: '   ', onSubmit });

    const input = screen.getByRole('textbox', { name: 'Answer input' });
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
    await user.type(input, '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit a nonempty answer during composition', () => {
    const onSubmit = jest.fn();
    renderInput({ value: 'answer', onSubmit });
    const input = screen.getByRole('textbox', { name: 'Answer input' });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 229 });
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('answer');
  });

  it('allows another attempt when the controlled answer changes without a disabled transition', () => {
    const onSubmit = jest.fn();
    const { rerender } = renderInput({ value: 'first', onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();

    rerender(
      <ThemeProvider theme={theme}>
        <AnimatedInput value="second" onChange={jest.fn()} onSubmit={onSubmit} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(onSubmit.mock.calls).toEqual([['first'], ['second']]);
  });

  it('lets the user edit an answer after submitting without a disabled transition', () => {
    const onSubmit = jest.fn();
    const onChange = jest.fn();
    const { rerender } = renderInput({ value: 'first', onSubmit, onChange });
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer input' }), {
      target: { value: 'second' },
    });
    expect(onChange).toHaveBeenCalledWith('second');
    rerender(
      <ThemeProvider theme={theme}>
        <AnimatedInput value="second" onChange={onChange} onSubmit={onSubmit} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onSubmit.mock.calls).toEqual([['first'], ['second']]);
  });

  it('submits the answer without submitting the outer form or leaking styling props', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onOuterSubmit = jest.fn(event => event.preventDefault());
    const { container } = render(
      <ThemeProvider theme={theme}>
        <form onSubmit={onOuterSubmit}>
          <AnimatedInput
            value="answer"
            onChange={jest.fn()}
            onSubmit={onSubmit}
            isError
            autoFocus={false}
          />
        </form>
      </ThemeProvider>
    );

    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelector('[data-error="true"]')).toBeInTheDocument();
    expect(container.querySelector('[iserror]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onOuterSubmit).not.toHaveBeenCalled();
  });

  it('handles Enter without submitting an enclosing form', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onOuterSubmit = jest.fn(event => event.preventDefault());
    render(
      <ThemeProvider theme={theme}>
        <form onSubmit={onOuterSubmit}>
          <AnimatedInput value="answer" onChange={jest.fn()} onSubmit={onSubmit} />
        </form>
      </ThemeProvider>
    );

    await user.type(screen.getByRole('textbox', { name: 'Answer input' }), '{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('answer');
    expect(onOuterSubmit).not.toHaveBeenCalled();
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
