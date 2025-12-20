import { useUserContext } from '../context/UserContext';

export const useUsers = () => {
  return useUserContext();
};
