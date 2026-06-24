import React, { createContext, useState, useContext } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [callerNumber, setCallerNumber] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  return (
    <SessionContext.Provider value={{
      callerNumber, setCallerNumber,
      sessionActive, setSessionActive,
      sessionId, setSessionId
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => useContext(SessionContext);
