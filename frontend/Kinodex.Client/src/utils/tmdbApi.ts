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

// Every poster or backdrop TMDB has for a movie or TV show, as image paths (e.g. "/abc123.jpg"),
// best voted first. English and language-neutral images only, so any text on them is readable.
export async function getTMDBImages(
  kind: "movie" | "tv",
  tmdbId: number,
  imageType: "poster" | "backdrop",
): Promise<string[]> {
  type TmdbImage = { file_path: string; vote_average: number; vote_count: number };
  const data = await tmdbGet<{ posters?: TmdbImage[]; backdrops?: TmdbImage[] }>(
    `/${kind}/${tmdbId}/images?include_image_language=en,null`,
  );
  const images = (imageType === "poster" ? data?.posters : data?.backdrops) ?? [];
  return images
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .map((p) => p.file_path);
}

export interface TMDBPerson {
  id: number;
  name: string;
  photoUrl: string | null; // Full image URL, or null when TMDB has no photo
}

// People matching a name, e.g. for picking a director collection's director. People TMDB knows
// for directing come first.
export async function searchTMDBPeople(query: string): Promise<TMDBPerson[]> {
  type Result = {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department?: string;
  };
  const data = await tmdbGet<{ results?: Result[] }>(
    `/search/person?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
  );
  const results = data?.results ?? [];
  const directors = results.filter((p) => p.known_for_department === "Directing");
  const others = results.filter((p) => p.known_for_department !== "Directing");
  return [...directors, ...others].slice(0, 10).map((p) => ({
    id: p.id,
    name: p.name,
    photoUrl: p.profile_path ? `https://image.tmdb.org/t/p/h632${p.profile_path}` : null,
  }));
}

// TV search results don't include a season count, so it comes from the show's details
export async function getTMDBTvSeasonCount(tmdbId: number): Promise<number> {
  const data = await tmdbGet<{ number_of_seasons?: number }>(`/tv/${tmdbId}?language=en-US`);
  return data?.number_of_seasons ?? 0;
}
