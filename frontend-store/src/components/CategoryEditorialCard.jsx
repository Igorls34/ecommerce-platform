import { memo } from 'react';
import { Link } from 'react-router-dom';

import { HollowOverlayBox } from './HollowOverlayBox';

export const CategoryEditorialCard = memo(function CategoryEditorialCard({ category, imageUrl, label }) {
  return (
    <Link to={`/produtos?categoria=${category.id}`} className="editorial-category-card">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={category.name}
          className="editorial-category-image"
          width="640"
          height="512"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="editorial-category-image editorial-category-fallback" aria-hidden="true" />
      )}
      <div className="editorial-category-scrim" />
      <HollowOverlayBox label={label} />
    </Link>
  );
});
