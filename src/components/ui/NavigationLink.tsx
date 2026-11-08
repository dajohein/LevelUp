import { Link, LinkProps } from 'react-router-dom';

// Keep Emotion's component types compatible with the router's React declarations.
export const NavigationLink = (props: LinkProps) => <Link {...props} />;
