import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ContentSearch({ onPlay }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

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

    const handleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="w-full max-w-[600px] relative font-sans">
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
                        <div className="p-2 flex flex-col gap-1 max-h-[65vh] overflow-y-auto custom-scrollbar">
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
                                        className={`rounded-lg transition-all duration-200 ${isExpanded ? 'bg-[#1e1e1e]' : 'hover:bg-[#1e1e1e]'}`}
                                    >
                                        <div 
                                            className="flex items-center gap-4 p-2 cursor-pointer select-none"
                                            onClick={() => handleExpand(item.id)}
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
                                            <div className="px-4 pb-4 pt-2 ml-[60px] animate-fadeIn">
                                                <p className="text-[#aaa] text-[0.85rem] leading-relaxed line-clamp-3 mb-4">
                                                    {item.overview || "No description available."}
                                                </p>
                                                <button 
                                                    onClick={() => onPlay(item)}
                                                    className="flex items-center gap-2 bg-white text-black px-5 py-1.5 rounded-full font-bold text-[0.9rem] hover:bg-[#e6e6e6] transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                    </svg>
                                                    Play
                                                </button>
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