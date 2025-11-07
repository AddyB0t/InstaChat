import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

export const GlueStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GluestackUIProvider config={config}>
      {children}
    </GluestackUIProvider>
  );
};