import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

// Which item a list page has open in its side drawer, kept in the URL (e.g. ?movie=12) so the
// browser's Back button closes it and a reload (e.g. after saving an edit) reopens it.
export function useDrawerParam(param: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get(param);

  const open = (id?: number) => {
    if (id === undefined) return;
    const next = new URLSearchParams(searchParams);
    next.set(param, String(id));
    // Marked so closing can step back through history rather than adding another entry
    setSearchParams(next, { state: { drawerFromList: true } });
  };

  const close = () => {
    if ((location.state as { drawerFromList?: boolean } | null)?.drawerFromList) {
      navigate(-1);
      return;
    }
    // Opened straight from a link or a reload: just drop the parameter
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next, { replace: true });
  };

  return { openId, open, close };
}
