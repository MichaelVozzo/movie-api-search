import React from 'react';
import { useDebounce } from 'react-use';
import { useEffect, useState } from 'react';
import Search from './components/Search';
import MovieCard from './components/MovieCard';
import { getTrendingMovies, updateSearchCount } from './appwrite.js';
import LoaderTrending from './components/LoaderTrending.jsx';
import LoaderMovies from './components/LoaderMovies.jsx';

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_OPTIONS = {
  method: 'GET',
  headers:{
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const App = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [movieList, setMovieList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingErrorMessage, setTrendingErrorMessage] = useState('');
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);  
  
  // New state to track when trending needs to refresh
  const [refreshTrending, setRefreshTrending] = useState(0);

  //Debounce the search term to prevent making too many API requests
  //by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]) 

  const fetchMovies = async (query = '') => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const endpoint = query ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}` : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      const response = await fetch(endpoint, API_OPTIONS);
      if(!response.ok){
        throw new Error('Failed to fetch movies');
      }
      const data = await response.json();
        if(data.Response === 'False'){
          setErrorMessage(data.Error || 'Failed to fetch movies');
          setMovieList([]);
          return;
        }
        setMovieList(data.results || []);
        if(query && data.results.length > 0){
          // The updateSearchCount now returns whether the top 5 changed
          const topFiveChanged = await updateSearchCount(query, data.results[0]);
          
          // Only refresh the trending list if the top 5 changed
          if (topFiveChanged) {
            setRefreshTrending(prev => prev + 1);
          }
        }
    } catch (error) {
      console.error(`Error fetching movie: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally{
      setIsLoading(false);
    }
  }

  const loadTrendingMovies = async () => {
    setIsTrendingLoading(true);
    setTrendingErrorMessage('');
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
    } catch (error) {
      console.error(`Error fetching trending movies: ${error}`);
      setTrendingErrorMessage('Error loading trending movies. Please try again later.');
    } finally {
      setIsTrendingLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Load trending movies on initial load and when refreshTrending changes
  useEffect(() => {
    loadTrendingMovies();
  }, [refreshTrending]);

  return (
    <main>
      <div className='pattern'>
        <div className='wrapper'>
          <header>
            <img src="./hero.png" alt="Hero Banner" />
            <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy Without the Hassle</h1>
            <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </header>
          
          <section className="trending">
            <h2>Trending Movies</h2>
            {isTrendingLoading ? (
              <LoaderTrending />
            ) : trendingErrorMessage ? (
              <p className="text-red-500">{trendingErrorMessage}</p>
            ) : (
              <ul>
                {trendingMovies.map((movie, index) => (
                  <li key={movie.$id}>
                    <p>{index + 1}</p>
                    <img src={movie.poster_url} alt={movie.title} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="all-movies">
            <h2>All Movies</h2>
            {isLoading ? (
              <LoaderMovies />
            ) : errorMessage ? (
              <p className="text-red-500">{errorMessage}</p>
            ) :(
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.id} movie={movie}/>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default App