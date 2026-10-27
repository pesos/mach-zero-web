import { Link } from 'react-router';

export function NotFound() {
  return (
    <p>
      This page does not exist.{' '}
      <Link className="underline" to="/">
        Back to the event
      </Link>
    </p>
  );
}
