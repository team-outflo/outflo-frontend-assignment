import { createContext, useContext, useState } from "react";

const SelectActionContext = createContext({
  selectedActionNode: "",
  setSelectedActionNode: (actionId: string) => {},
});

export default function SelectedActionContextProvider({ children }) {
  const [selectedActionNode, setSelectedActionNode] = useState("");

  return (
    <SelectActionContext.Provider
      value={{ setSelectedActionNode, selectedActionNode }}
    >
      {children}
    </SelectActionContext.Provider>
  );
}

export const useSelectedActionContext = () => useContext(SelectActionContext);
