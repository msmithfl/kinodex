# TMDB Movie Matching Setup

## Overview
The TMDB Movie Matching feature automatically matches your movies with The Movie Database (TMDB) to enrich your collection with metadata, posters, and tracking capabilities.

## Setup Instructions

### 1. Get a TMDB API Key
1. Go to [The Movie Database](https://www.themoviedb.org/)
2. Create a free account
3. Navigate to Settings → API
4. Request an API key (choose "Developer" option)
5. Fill out the application form (can be simple, just mention personal use)
6. You'll receive an API Key (v3 auth)

### 2. Configure the API Key

#### For Development (appsettings.Development.json)
```json
{
  "TMDB_API_KEY": "your-api-key-here"
}
```

#### For Production (Environment Variable)
Set the environment variable:
```bash
export TMDB_API_KEY="your-api-key-here"
```

Or in your hosting platform (Railway, Azure, etc.), add:
- Key: `TMDB_API_KEY`
- Value: `your-api-key-here`

### 3. Using the Movie Matching Feature

1. **Access the Match Movies Page**
   - Navigate to "Match Movies" in the sidebar
   - You'll see all movies without TMDB IDs

2. **Run Automatic Matching**
   - Click "Find Matches" to search TMDB for all unmatched movies
   - The service will search TMDB based on title and year
   - Review suggestions for each movie

3. **Review and Accept Matches**
   - For each movie, you'll see suggested matches from TMDB
   - Each suggestion shows:
     - Title and year
     - Poster image (if available)
     - Movie overview
   - Click the green check button to accept a match
   - Click "Skip this movie" to ignore and move to the next

4. **Manual Assignment**
   - If automatic matching doesn't find the right movie
   - You can manually search and assign later
   - Or edit the movie directly with the TMDB ID

### 4. Benefits of TMDB Matching

Once movies are matched with TMDB:
- ✅ Enhanced metadata
- ✅ Automatic poster updates
- ✅ Better collection tracking
- ✅ Integration with collection checklists
- ✅ Future features like recommendations, similar movies, etc.

### 5. Rate Limiting

The TMDB API has rate limits:
- 50 requests per second for paid accounts
- The service automatically adds 250ms delay between requests to be safe
- Large libraries may take a few minutes to process

### 6. New Movie Additions

When adding movies going forward:
- Search TMDB from the Add Movie page
- Select a movie from search results
- TMDB ID is automatically captured
- No manual matching needed!

## Troubleshooting

### "TMDB API key not configured" Error
- Make sure the API key is set in your configuration
- Restart the backend after adding the key
- Verify the key is correct (32-character hex string)

### No Matches Found
- Check if the movie title is spelled correctly in your database
- Try manually searching with alternate titles
- Some very obscure or regional films may not be in TMDB

### API Rate Limit Errors
- Wait a minute and try again
- The service already includes delays, but TMDB may throttle if many requests happen at once
