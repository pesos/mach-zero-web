import { CompassIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ErrorPage } from '@/components/ErrorPage';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <ErrorPage
      icon={CompassIcon}
      title="Page not found"
      action={{ label: 'Back to the event', onClick: () => void navigate('/') }}
    >
      This page does not exist.
    </ErrorPage>
  );
}
