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

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBCredits {
  id: number;
  cast: unknown[];
  crew: TMDBCrewMember[];
}

export interface TMDBPersonMovieCredit {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  job?: string;
  department?: string;
}

export interface TMDBPersonMovieCredits {
  id: number;
  cast: TMDBPersonMovieCredit[];
  crew: TMDBPersonMovieCredit[];
}

function tmdbHeaders(): HeadersInit | null {
  const TMDB_API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;
  if (!TMDB_API_TOKEN) {
    console.error('TMDB API token not configured');
    return null;
  }
  return {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_API_TOKEN}`,
  };
}

// Credits (cast + crew) for a single movie, used to find its director(s).
export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  const headers = tmdbHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/credits?language=en-US`,
      { headers },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("TMDB movie credits fetch failed:", err);
    return null;
  }
}

// Every movie (cast + crew) a person is credited on, used to find the rest of a director's filmography.
export async function getPersonMovieCredits(personId: number): Promise<TMDBPersonMovieCredits | null> {
  const headers = tmdbHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/person/${personId}/movie_credits?language=en-US`,
      { headers },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("TMDB person credits fetch failed:", err);
    return null;
  }
}

export async function searchTMDB(query: string, year?: string): Promise<TMDBMovie[]> {
  const TMDB_API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;
  
  if (!TMDB_API_TOKEN) {
    console.error('TMDB API token not configured');
    return [];
  }

  try {
    // Build URL with optional year parameter
    let url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
      query
    )}&include_adult=false&language=en-US&page=1`;
    
    if (year && year.trim()) {
      url += `&year=${encodeURIComponent(year.trim())}`;
    }
    
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TMDB_API_TOKEN}`,
      },
    });
    const data = await res.json();
    return data.results?.slice(0, 10) || [];
  } catch (err) {
    console.error("TMDB search failed:", err);
    return [];
  }
}
