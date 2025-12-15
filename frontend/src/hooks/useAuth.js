import { useSelector } from 'react-redux';

export function useAuth() {
  const auth = useSelector(s => s.auth);
  return { user: auth.user, token: auth.token };
}
