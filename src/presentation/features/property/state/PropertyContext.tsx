// Property Context - Provides property state and actions
// React Context using the property state and reducer

import React, { createContext, useReducer, useContext, ReactNode, Dispatch } from 'react';
import { PropertyState, PropertyAction, propertyReducer } from './PropertyState';

interface PropertyContextType {
  state: PropertyState;
  dispatch: Dispatch<PropertyAction>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(propertyReducer, PropertyState.getInitialState());

  return (
    <PropertyContext.Provider value={{ state, dispatch }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('usePropertyContext must be used within PropertyProvider');
  }
  return context;
};
