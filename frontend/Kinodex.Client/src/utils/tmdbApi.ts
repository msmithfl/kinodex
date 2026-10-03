import type { TMDBMovie, TMDBTvShow } from '../types';

export const GENRE_MAP: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

// TMDB uses a separate genre list for TV, with several combined genres
export const TV_GENRE_MAP: { [key: number]: string } = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western'
};

async function tmdbGet<T>(path: string): Promise<T | null> {
  const TMDB_API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;

  if (!TMDB_API_TOKEN) {
    console.error('TMDB API token not configured');
    return null;
  }

  try {
    const res = await fetch(`https://api.themoviedb.org/3${path}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TMDB_API_TOKEN}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("TMDB request failed:", err);
    return null;
  }
}

export async function searchTMDB(query: string, year?: string): Promise<TMDBMovie[]> {
  let path = `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  if (year && year.trim()) {
    path += `&year=${encodeURIComponent(year.trim())}`;
  }

  const data = await tmdbGet<{ results?: TMDBMovie[] }>(path);
  return data?.results?.slice(0, 10) ?? [];
}

export async function searchTMDBTv(query: string, year?: string): Promise<TMDBTvShow[]> {
  let path = `/search/tv?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  if (year && year.trim()) {
    path += `&first_air_date_year=${encodeURIComponent(year.trim())}`;
  }

  const data = await tmdbGet<{ results?: TMDBTvShow[] }>(path);
  return data?.results?.slice(0, 10) ?? [];
}

// TV search results don't include a season count, so it comes from the show's details
export async function getTMDBTvSeasonCount(tmdbId: number): Promise<number> {
  const data = await tmdbGet<{ number_of_seasons?: number }>(`/tv/${tmdbId}?language=en-US`);
  return data?.number_of_seasons ?? 0;
}
