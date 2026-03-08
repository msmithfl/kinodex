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
  genre_ids: number[];
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