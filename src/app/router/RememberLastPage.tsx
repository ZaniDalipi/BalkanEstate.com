import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { rememberLastPage } from './lastPage';

/** Rendered around every page: keeps the page on screen as the tab's last page. */
export const RememberLastPage: React.FC = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    rememberLastPage(`${pathname}${search}`);
  }, [pathname, search]);
  return null;
};
