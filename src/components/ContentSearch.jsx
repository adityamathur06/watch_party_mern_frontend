import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ContentSearch({ onPlay }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // State for handling TV show drill-downs
    const [tvData, setTvData] = useState({});
    const [activeSeason, setActiveSeason] = useState(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await axios.get(
                    `https://api.themoviedb.org/3/search/multi?api_key=${import.meta.env.VITE_TMDB_API_KEY}&query=${query}&language=en-US&page=1&include_adult=false`
                );
                const mediaResults = response.data.results.filter(
                    item => item.media_type === 'movie' || item.media_type === 'tv'
                );
                setResults(mediaResults.slice(0, 5));
            } catch (error) {
                console.error("TMDB Search Error:", error);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleExpand = async (item) => {
        const isExpanding = expandedId !== item.id;
        setExpandedId(isExpanding ? item.id : null);
        
        // Reset drill-down state every time we open/close an accordion
        setActiveSeason(null);

        if (isExpanding && item.media_type === 'tv' && !tvData[item.id]) {
            try {
                const res = await axios.get(
                    `https://api.themoviedb.org/3/tv/${item.id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
                );
                setTvData(prev => ({ ...prev, [item.id]: { seasons: res.data.seasons } }));
            } catch (error) {
                console.error("Failed to fetch seasons:", error);
            }
        }
    };

    const handleSeasonClick = async (tvId, seasonNumber) => {
        setActiveSeason(seasonNumber);
        
        const cacheKey = `${tvId}_${seasonNumber}`;
        if (!tvData[cacheKey]) {
            try {
                const res = await axios.get(
                    `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
                );
                setTvData(prev => ({ ...prev, [cacheKey]: res.data.episodes }));
            } catch (error) {
                console.error("Failed to fetch episodes:", error);
            }
        }
    };

    return (
        <div className="w-full max-w-[650px] relative font-sans">
            <div className="relative z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Type here to search movies & TV shows..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] text-white text-[1rem] rounded-xl pl-12 pr-10 py-3.5 focus:outline-none focus:border-accent transition-colors shadow-lg"
                />
                {query && (
                    <button 
                        onClick={() => { setQuery(''); setResults([]); setExpandedId(null); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
                    >
                        &times;
                    </button>
                )}
            </div>

            {query.trim().length >= 2 && (
                <div className="absolute top-[110%] left-0 w-full bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden flex flex-col">
                    
                    {isSearching && results.length === 0 ? (
                        <div className="p-6 text-center text-[#888] text-sm animate-pulse">Searching the database...</div>
                    ) : results.length > 0 ? (
                        <div className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {results.map((item) => {
                                const isExpanded = expandedId === item.id;
                                const title = item.title || item.name;
                                const year = (item.release_date || item.first_air_date || "").substring(0, 4);
                                const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
                                const type = item.media_type === 'movie' ? 'Movie' : 'TV Show';
                                const posterUrl = item.poster_path 
                                    ? `https://image.tmdb.org/t/p/w154${item.poster_path}`
                                    : 'https://via.placeholder.com/154x231/222222/555555?text=No+Poster';

                                return (
                                    <div 
                                        key={item.id} 
                                        className={`rounded-lg transition-all duration-200 ${isExpanded ? 'bg-[#1a1a1a]' : 'hover:bg-[#1e1e1e]'}`}
                                    >
                                        <div 
                                            className="flex items-center gap-4 p-2 cursor-pointer select-none"
                                            onClick={() => handleExpand(item)}
                                        >
                                            <img 
                                                src={posterUrl} 
                                                alt={title} 
                                                className="w-12 h-[72px] object-cover rounded-md shadow-md"
                                            />
                                            <div className="flex-1 flex flex-col overflow-hidden">
                                                <span className="text-white font-bold text-[1rem] truncate">{title}</span>
                                                <div className="text-[#888] text-[0.8rem] mt-1 flex items-center gap-2">
                                                    <span>{type}</span>
                                                    {year && <><span className="w-1 h-1 rounded-full bg-[#444]"></span><span>{year}</span></>}
                                                    <span className="w-1 h-1 rounded-full bg-[#444]"></span>
                                                    <span className="flex items-center gap-1 text-[#e5b10b]">
                                                        ⭐ {rating}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-[#555] shrink-0 transition-transform duration-300 mr-2 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-2 ml-[60px] animate-fadeIn flex flex-col gap-3">
                                                
                                                {/* MOVIE VIEW */}
                                                {item.media_type === 'movie' && (
                                                    <>
                                                        <p className="text-[#aaa] text-[0.85rem] leading-relaxed line-clamp-3 mb-2">
                                                            {item.overview || "No description available."}
                                                        </p>
                                                        <button 
                                                            onClick={() => onPlay(item)}
                                                            className="flex items-center justify-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-[0.95rem] hover:bg-[#e6e6e6] transition-colors w-max"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                            </svg>
                                                            Play Movie
                                                        </button>
                                                    </>
                                                )}

                                                {/* TV SHOW VIEW */}
                                                {item.media_type === 'tv' && (
                                                    <>
                                                        {/* Step 1: Select Season */}
                                                        {!activeSeason ? (
                                                            <>
                                                                <p className="text-[#aaa] text-[0.85rem] leading-relaxed line-clamp-2 mb-1">{item.overview || "No description available."}</p>
                                                                <div className="font-semibold text-white mb-1 text-[0.9rem]">Select a Season</div>
                                                                {tvData[item.id]?.seasons ? (
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                                                        {tvData[item.id].seasons.filter(s => s.season_number > 0).map(s => (
                                                                            <button 
                                                                                key={s.id} 
                                                                                onClick={() => handleSeasonClick(item.id, s.season_number)} 
                                                                                className="bg-[#222] hover:bg-white hover:text-black border border-[#333] text-[#ddd] py-2 rounded-md text-[0.85rem] transition-colors font-medium"
                                                                            >
                                                                                {/* Force normalized naming instead of using s.name */}
                                                                                Season {s.season_number}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[#888] text-[0.8rem] animate-pulse py-2">Loading seasons...</div>
                                                                )}
                                                            </>
                                                        
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <button onClick={() => setActiveSeason(null)} className="text-[#888] hover:text-white transition-colors p-1 -ml-1 bg-transparent border-none cursor-pointer">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                                                        </svg>
                                                                    </button>
                                                                    <div className="font-bold text-white text-[0.95rem]">Season {activeSeason}</div>
                                                                </div>
                                                                
                                                                {tvData[`${item.id}_${activeSeason}`] ? (
                                                                    <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1.5 pb-2">
                                                                        {tvData[`${item.id}_${activeSeason}`].map(ep => {
                                                                            // Ensure we have a fallback if TMDB doesn't have an episode thumbnail
                                                                            const epImageUrl = ep.still_path 
                                                                                ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                                                                                : 'https://via.placeholder.com/300x170/222222/555555?text=No+Image';

                                                                            return (
                                                                                <div key={ep.id} className="flex gap-3.5 p-2 bg-[#111] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#444] rounded-xl transition-all duration-200 group">
                                                                                    
                                                                                    {/* Episode Thumbnail */}
                                                                                    <div className="w-[110px] h-[64px] shrink-0 rounded-lg overflow-hidden relative bg-black shadow-md mt-0.5">
                                                                                        <img src={epImageUrl} alt={ep.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                    
                                                                                    {/* Episode Info */}
                                                                                    <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                                                                                        <h4 className="text-white font-bold text-[0.85rem] truncate">
                                                                                            <span className="text-accent mr-1.5">{ep.episode_number}.</span>
                                                                                            {ep.name}
                                                                                        </h4>
                                                                                        <p className="text-[#888] text-[0.7rem] line-clamp-2 mt-1 leading-snug">
                                                                                            {ep.overview || "No description available."}
                                                                                        </p>
                                                                                    </div>
                                                                                    
                                                                                    {/* Play Button */}
                                                                                    <div className="shrink-0 flex items-center pr-1">
                                                                                        <button 
                                                                                            onClick={() => onPlay(item, activeSeason, ep.episode_number)}
                                                                                            className="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-accent text-white flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer hover:scale-105"
                                                                                            title="Play Episode"
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
                                                                                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                                                            </svg>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[#888] text-[0.8rem] animate-pulse py-2">Loading episodes...</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-[#888] text-sm">No results found for "{query}"</div>
                    )}
                </div>
            )}
        </div>
    );
}