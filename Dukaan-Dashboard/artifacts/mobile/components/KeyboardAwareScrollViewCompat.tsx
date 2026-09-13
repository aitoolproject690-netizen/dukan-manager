import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & { children?: React.ReactNode; keyboardVerticalOffset?: number };

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  keyboardVerticalOffset = 0,
  ...props
}: Props) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
