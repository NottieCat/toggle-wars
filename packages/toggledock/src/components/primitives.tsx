import * as React from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type TdButtonVariant = 'accent' | 'surface' | 'ghost' | 'danger';
export type TdButtonSize = 'sm' | 'md' | 'icon';

export interface TdButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TdButtonVariant;
  size?: TdButtonSize;
}

export const TdButton = React.forwardRef<HTMLButtonElement, TdButtonProps>(
  ({ variant = 'surface', size = 'sm', type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('td-btn', `td-btn--${variant}`, `td-btn--${size}`, className)}
      {...props}
    />
  ),
);
TdButton.displayName = 'TdButton';

export type TdPillTone = 'neutral' | 'accent' | 'warn' | 'danger';

export interface TdPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TdPillTone;
}

export const TdPill = React.forwardRef<HTMLSpanElement, TdPillProps>(
  ({ tone = 'neutral', className, ...props }, ref) => (
    <span ref={ref} className={cx('td-pill', `td-pill--${tone}`, className)} {...props} />
  ),
);
TdPill.displayName = 'TdPill';

export interface TdChoicePillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const TdChoicePill = React.forwardRef<HTMLButtonElement, TdChoicePillProps>(
  ({ active = false, type = 'button', className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cx('td-choice-pill', className)}
      {...props}
    />
  ),
);
TdChoicePill.displayName = 'TdChoicePill';

export interface TdSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export const TdSwitch = React.forwardRef<HTMLButtonElement, TdSwitchProps>(
  ({ checked, onCheckedChange, disabled = false, id, className, 'aria-label': ariaLabel }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      className={cx('td-switch', className)}
      onClick={() => {
        if (!disabled) {
          onCheckedChange(!checked);
        }
      }}
    >
      <span className="td-switch-thumb" aria-hidden="true" />
    </button>
  ),
);
TdSwitch.displayName = 'TdSwitch';

export interface TdRuleProps extends React.HTMLAttributes<HTMLHRElement> {
  emphasis?: 'subtle' | 'strong';
}

export const TdRule = React.forwardRef<HTMLHRElement, TdRuleProps>(
  ({ emphasis = 'subtle', className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cx('td-rule', emphasis === 'strong' && 'td-rule--strong', className)}
      {...props}
    />
  ),
);
TdRule.displayName = 'TdRule';

export type TdInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TdInput = React.forwardRef<HTMLInputElement, TdInputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cx('td-input', className)} {...props} />
  ),
);
TdInput.displayName = 'TdInput';
